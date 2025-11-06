-- Rename conflicting columns first
ALTER TABLE public.events 
  RENAME COLUMN entry_fee TO registration_fee;

-- Update events table with all necessary columns and proper constraints
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS event_type text CHECK (event_type IN ('hackathon', 'workshop', 'competition')),
  ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_fee numeric(10,2) DEFAULT 0 CHECK (registration_fee >= 0),
  ADD COLUMN IF NOT EXISTS prizes jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS min_team_size integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_team_size integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_team_event boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Drop existing constraints if they exist
DO $$ 
BEGIN
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS valid_team_size;
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS valid_dates;
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_registration_fee_check;
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_team_size_check;
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_max_participants_check;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Add updated constraints
ALTER TABLE public.events 
  ADD CONSTRAINT valid_team_size 
    CHECK (min_team_size <= max_team_size AND min_team_size >= 1),
  ADD CONSTRAINT valid_dates 
    CHECK (start_date <= end_date AND (registration_deadline IS NULL OR registration_deadline <= start_date)),
  ADD CONSTRAINT valid_registration_fee
    CHECK (NOT is_paid OR (is_paid AND registration_fee > 0)),
  ADD CONSTRAINT valid_max_participants
    CHECK (max_participants > 0);

-- Update event_registrations table
ALTER TABLE public.event_registrations 
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS college_name text,
  ADD COLUMN IF NOT EXISTS course text,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS skills text[],
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS why_join text,
  ADD COLUMN IF NOT EXISTS registration_status text DEFAULT 'pending' 
    CHECK (registration_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS team_name text,
  ADD COLUMN IF NOT EXISTS team_members jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create registration management functions
CREATE OR REPLACE FUNCTION handle_team_registration(
  p_event_id uuid,
  p_user_id uuid,
  p_team_name text,
  p_team_members jsonb,
  p_registration_data jsonb DEFAULT '{}'::jsonb
) RETURNS uuid 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_registration_id uuid;
  v_event record;
  v_current_registrations integer;
BEGIN
  -- Get event details
  SELECT * INTO v_event 
  FROM events 
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  -- Validate event is open for registration
  IF v_event.registration_deadline IS NOT NULL AND v_event.registration_deadline < NOW() THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  -- Check if event requires teams
  IF NOT v_event.is_team_event THEN
    RAISE EXCEPTION 'This event does not support team registration';
  END IF;

  -- Validate team size
  IF jsonb_array_length(p_team_members) < v_event.min_team_size THEN
    RAISE EXCEPTION 'Team must have at least % members', v_event.min_team_size;
  END IF;

  IF jsonb_array_length(p_team_members) > v_event.max_team_size THEN
    RAISE EXCEPTION 'Team cannot have more than % members', v_event.max_team_size;
  END IF;

  -- Check available slots
  SELECT COUNT(*) INTO v_current_registrations
  FROM event_registrations
  WHERE event_id = p_event_id 
  AND registration_status IN ('approved', 'pending');

  IF v_current_registrations >= v_event.max_participants THEN
    RAISE EXCEPTION 'Event has reached maximum capacity';
  END IF;

  -- Check unique team name
  IF EXISTS (
    SELECT 1 FROM event_registrations 
    WHERE event_id = p_event_id 
    AND team_name = p_team_name
    AND registration_status != 'rejected'
  ) THEN
    RAISE EXCEPTION 'Team name already exists';
  END IF;

  -- Create registration
  INSERT INTO event_registrations (
    event_id,
    user_id,
    team_name,
    team_members,
    registration_status,
    payment_status,
    email,
    college_name,
    course,
    graduation_year,
    skills,
    github_url,
    linkedin_url,
    portfolio_url,
    why_join
  ) VALUES (
    p_event_id,
    p_user_id,
    p_team_name,
    p_team_members,
    CASE WHEN v_event.is_paid THEN 'pending' ELSE 'approved' END,
    CASE WHEN v_event.is_paid THEN 'pending' ELSE 'completed' END,
    p_registration_data->>'email',
    p_registration_data->>'college_name',
    p_registration_data->>'course',
    (p_registration_data->>'graduation_year')::integer,
    ARRAY(SELECT jsonb_array_elements_text(p_registration_data->'skills')),
    p_registration_data->>'github_url',
    p_registration_data->>'linkedin_url',
    p_registration_data->>'portfolio_url',
    p_registration_data->>'why_join'
  )
  RETURNING id INTO v_registration_id;

  RETURN v_registration_id;
END;
$$;

-- Create helper function to get event registration stats
CREATE OR REPLACE FUNCTION get_event_registration_stats(event_id uuid)
RETURNS TABLE (
  total_capacity integer,
  registered_count integer,
  approved_count integer,
  pending_count integer,
  rejected_count integer,
  available_slots integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.max_participants as total_capacity,
    count(er.id) as registered_count,
    count(er.id) filter (where er.registration_status = 'approved') as approved_count,
    count(er.id) filter (where er.registration_status = 'pending') as pending_count,
    count(er.id) filter (where er.registration_status = 'rejected') as rejected_count,
    e.max_participants - count(er.id) filter (where er.registration_status in ('approved', 'pending')) as available_slots
  FROM events e
  LEFT JOIN event_registrations er on er.event_id = e.id
  WHERE e.id = $1
  GROUP BY e.max_participants;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS set_timestamp_events ON events;
DROP TRIGGER IF EXISTS set_timestamp_registrations ON event_registrations;

CREATE TRIGGER set_timestamp_events
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_registrations
  BEFORE UPDATE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();