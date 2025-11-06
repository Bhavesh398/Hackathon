-- Event management schema
-- Create enum for event status
CREATE TYPE event_status AS ENUM ('draft', 'published', 'in_progress', 'completed', 'cancelled');

-- Create events table with all required fields
CREATE TABLE events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    theme text,
    description text,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    registration_deadline timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES auth.users(id) NOT NULL,
    status event_status DEFAULT 'draft' NOT NULL,
    
    -- Team configuration
    is_team_event boolean DEFAULT false NOT NULL,
    min_team_size integer DEFAULT 1 CHECK (min_team_size >= 1),
    max_team_size integer DEFAULT 1 CHECK (max_team_size >= min_team_size),
    max_participants integer DEFAULT 100 CHECK (max_participants > 0),
    registration_fee numeric(10,2) DEFAULT 0 CHECK (registration_fee >= 0),

    -- Store configurable settings in JSONB
    settings JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT valid_registration_deadline CHECK (registration_deadline <= start_date)
);

-- Create event rounds table
CREATE TABLE event_rounds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    round_number integer NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT valid_round_dates CHECK (end_date > start_date)
);

-- Create judging criteria table
CREATE TABLE judging_criteria (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    criterion text NOT NULL,
    description text,
    weight numeric(3,2) DEFAULT 1.00 CHECK (weight > 0 AND weight <= 5.00),
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(event_id, criterion)
);

-- Create teams table
CREATE TABLE teams (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL,
    created_by uuid REFERENCES auth.users(id) NOT NULL,
    UNIQUE(event_id, name)
);

-- Create team members table
CREATE TABLE team_members (
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    joined_at timestamptz DEFAULT now() NOT NULL,
    role text DEFAULT 'member' NOT NULL,
    PRIMARY KEY (team_id, user_id)
);

-- Create event judges table
CREATE TABLE event_judges (
    event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    invited_at timestamptz DEFAULT now() NOT NULL,
    accepted_at timestamptz,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    PRIMARY KEY (event_id, user_id)
);

-- Create scores table for judge evaluations
CREATE TABLE scores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    round_id uuid REFERENCES event_rounds(id) ON DELETE CASCADE NOT NULL,
    team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    criterion_id uuid REFERENCES judging_criteria(id) ON DELETE CASCADE NOT NULL,
    judge_id uuid REFERENCES auth.users(id) NOT NULL,
    score numeric(4,2) CHECK (score >= 0 AND score <= 100),
    feedback text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(round_id, team_id, criterion_id, judge_id)
);

-- Add RLS policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE judging_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Events are viewable by everyone"
    ON events FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Events can be created by authenticated users"
    ON events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Events can be updated by creators"
    ON events FOR UPDATE
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Create function to validate team size
CREATE OR REPLACE FUNCTION validate_team_size()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we would exceed max team size
  IF (
    SELECT COUNT(*)
    FROM team_members
    WHERE team_id = NEW.team_id
  ) >= (
    SELECT max_team_size
    FROM events e
    JOIN teams t ON t.event_id = e.id
    WHERE t.id = NEW.team_id
  ) THEN
    RAISE EXCEPTION 'Team size would exceed maximum allowed size';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team size validation
CREATE TRIGGER check_team_size
  BEFORE INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_team_size();

-- Create function to check if user can judge event
CREATE OR REPLACE FUNCTION can_judge_event(event_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_judges
    WHERE event_id = $1 
    AND user_id = $2 
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql;

-- Add indexes for performance
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_event_rounds_event_id ON event_rounds(event_id);
CREATE INDEX idx_judging_criteria_event_id ON judging_criteria(event_id);
CREATE INDEX idx_teams_event_id ON teams(event_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_event_judges_event_id ON event_judges(event_id);
CREATE INDEX idx_scores_event_id ON scores(event_id);
CREATE INDEX idx_scores_round_id ON scores(round_id);
CREATE INDEX idx_scores_team_id ON scores(team_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scores_updated_at
    BEFORE UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();