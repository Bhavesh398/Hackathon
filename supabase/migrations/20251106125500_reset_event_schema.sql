-- Drop all existing event-related objects to start fresh
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TYPE IF EXISTS registration_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP FUNCTION IF EXISTS register_team_for_event CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Create enum types
CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create the events table with all required columns
CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    theme text,
    description text,
    event_type text CHECK (event_type IN ('hackathon', 'workshop', 'competition')),
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    registration_deadline timestamptz,
    is_paid boolean DEFAULT false,
    registration_fee numeric(10,2) DEFAULT 0,
    is_team_event boolean DEFAULT false,
    min_team_size integer DEFAULT 1,
    max_team_size integer DEFAULT 1,
    max_participants integer DEFAULT 100,
    settings jsonb DEFAULT '{}'::jsonb,
    prizes jsonb DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Add all constraints
    CONSTRAINT events_dates_check CHECK (end_date > start_date),
    CONSTRAINT events_registration_deadline_check CHECK (registration_deadline IS NULL OR registration_deadline <= start_date),
    CONSTRAINT events_team_size_check CHECK (
        (NOT is_team_event AND min_team_size = 1 AND max_team_size = 1) OR
        (is_team_event AND min_team_size >= 1 AND max_team_size >= min_team_size)
    ),
    CONSTRAINT events_max_participants_check CHECK (max_participants > 0),
    CONSTRAINT events_registration_fee_check CHECK (
        (NOT is_paid AND registration_fee = 0) OR
        (is_paid AND registration_fee > 0)
    )
);

-- Create event registrations table
CREATE TABLE public.event_registrations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    team_name text,
    team_members jsonb DEFAULT '[]'::jsonb,
    registration_status registration_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    payment_id text,
    email text NOT NULL,
    full_name text,
    college_name text,
    course text,
    graduation_year integer,
    skills text[],
    github_url text,
    linkedin_url text,
    portfolio_url text,
    why_join text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Add constraints
    CONSTRAINT unique_event_registration UNIQUE (event_id, user_id),
    CONSTRAINT valid_team_registration CHECK (
        (team_name IS NULL AND team_members = '[]'::jsonb) OR
        (team_name IS NOT NULL AND team_members != '[]'::jsonb)
    )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER set_timestamp_events
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_registrations
    BEFORE UPDATE ON public.event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create team registration function
CREATE OR REPLACE FUNCTION register_team_for_event(
    p_event_id uuid,
    p_user_id uuid,
    p_registration_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event record;
    v_registration_id uuid;
    v_team_name text;
    v_team_members jsonb;
BEGIN
    -- Get event details
    SELECT * INTO v_event 
    FROM events 
    WHERE id = p_event_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event not found';
    END IF;

    -- Extract team data
    v_team_name := p_registration_data->>'team_name';
    v_team_members := COALESCE(p_registration_data->'team_members', '[]'::jsonb);

    -- Validate registration deadline
    IF v_event.registration_deadline IS NOT NULL AND v_event.registration_deadline < now() THEN
        RAISE EXCEPTION 'Registration deadline has passed';
    END IF;

    -- Validate team requirements for team events
    IF v_event.is_team_event THEN
        IF v_team_name IS NULL THEN
            RAISE EXCEPTION 'Team name is required for team events';
        END IF;

        IF jsonb_array_length(v_team_members) < v_event.min_team_size THEN
            RAISE EXCEPTION 'Team must have at least % members', v_event.min_team_size;
        END IF;

        IF jsonb_array_length(v_team_members) > v_event.max_team_size THEN
            RAISE EXCEPTION 'Team cannot have more than % members', v_event.max_team_size;
        END IF;

        -- Check unique team name
        IF EXISTS (
            SELECT 1 FROM event_registrations 
            WHERE event_id = p_event_id 
            AND team_name = v_team_name
            AND registration_status != 'rejected'
        ) THEN
            RAISE EXCEPTION 'Team name is already taken';
        END IF;
    END IF;

    -- Check event capacity
    IF (
        SELECT COUNT(*)
        FROM event_registrations
        WHERE event_id = p_event_id
        AND registration_status IN ('pending', 'approved')
    ) >= v_event.max_participants THEN
        RAISE EXCEPTION 'Event has reached maximum capacity';
    END IF;

    -- Create registration
    INSERT INTO event_registrations (
        event_id,
        user_id,
        team_name,
        team_members,
        email,
        full_name,
        college_name,
        course,
        graduation_year,
        skills,
        github_url,
        linkedin_url,
        portfolio_url,
        why_join,
        registration_status,
        payment_status
    ) VALUES (
        p_event_id,
        p_user_id,
        CASE WHEN v_event.is_team_event THEN v_team_name ELSE NULL END,
        CASE WHEN v_event.is_team_event THEN v_team_members ELSE '[]'::jsonb END,
        p_registration_data->>'email',
        p_registration_data->>'full_name',
        p_registration_data->>'college_name',
        p_registration_data->>'course',
        (p_registration_data->>'graduation_year')::integer,
        array(select jsonb_array_elements_text(p_registration_data->'skills')),
        p_registration_data->>'github_url',
        p_registration_data->>'linkedin_url',
        p_registration_data->>'portfolio_url',
        p_registration_data->>'why_join',
        CASE WHEN v_event.is_paid THEN 'pending'::registration_status ELSE 'approved'::registration_status END,
        CASE WHEN v_event.is_paid THEN 'pending'::payment_status ELSE 'completed'::payment_status END
    )
    RETURNING id INTO v_registration_id;

    RETURN v_registration_id;
END;
$$;

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Events are viewable by everyone"
    ON public.events FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Events can be created by authenticated users"
    ON public.events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Events can be updated by creators"
    ON public.events FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by);

CREATE POLICY "Users can view their own registrations and event creators can view all"
    ON public.event_registrations FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_registrations.event_id 
            AND events.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create their own registrations"
    ON public.event_registrations FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own registrations"
    ON public.event_registrations FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());