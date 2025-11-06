-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Profile Extension
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id)
);

-- Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL, -- 'hackathon', 'competition', 'workshop'
    format TEXT NOT NULL, -- 'online', 'in-person', 'hybrid'
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER,
    location TEXT,
    venue_details JSONB,
    banner_image TEXT,
    cover_image TEXT,
    rules TEXT[],
    prizes JSONB[], -- Array of prize tiers
    tags TEXT[],
    tech_stack TEXT[],
    requirements TEXT[],
    is_featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft', -- 'draft', 'published', 'in_progress', 'completed', 'cancelled'
    visibility TEXT DEFAULT 'public', -- 'public', 'private', 'unlisted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Event Roles (for organizers, judges, mentors)
CREATE TABLE IF NOT EXISTS event_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'organizer', 'judge', 'mentor'
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id, role)
);

-- Event Registrations
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_name TEXT,
    team_size INTEGER,
    project_title TEXT,
    project_description TEXT,
    tech_stack TEXT[],
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'waitlisted'
    registration_data JSONB, -- Additional registration fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

-- Event Submissions
CREATE TABLE IF NOT EXISTS event_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID REFERENCES event_registrations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    github_url TEXT,
    demo_url TEXT,
    presentation_url TEXT,
    video_url TEXT,
    images TEXT[],
    tech_stack TEXT[],
    submission_data JSONB, -- Additional submission fields
    status TEXT DEFAULT 'submitted', -- 'draft', 'submitted', 'under_review', 'approved', 'rejected'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Judging Criteria
CREATE TABLE IF NOT EXISTS judging_criteria (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    max_score INTEGER NOT NULL,
    weight DECIMAL DEFAULT 1.0,
    category TEXT, -- 'technical', 'design', 'innovation', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Submission Evaluations
CREATE TABLE IF NOT EXISTS submission_evaluations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    submission_id UUID REFERENCES event_submissions(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scores JSONB NOT NULL, -- {criteria_id: score}
    feedback JSONB, -- {criteria_id: feedback}
    total_score DECIMAL,
    status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'revised'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(submission_id, judge_id)
);

-- Event Updates/Announcements
CREATE TABLE IF NOT EXISTS event_announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Event Timeline/Schedule
CREATE TABLE IF NOT EXISTS event_schedule (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT, -- 'registration', 'opening', 'workshop', 'submission', 'judging', 'results'
    location TEXT,
    is_mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Event Resources
CREATE TABLE IF NOT EXISTS event_resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'document', 'video', 'link'
    url TEXT NOT NULL,
    category TEXT, -- 'guide', 'template', 'tutorial', 'api'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Event Certificates
CREATE TABLE IF NOT EXISTS event_certificates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'participation', 'winner', 'runner_up', 'judge', 'mentor'
    certificate_url TEXT NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id, type)
);

-- Realtime Enable
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE event_announcements REPLICA IDENTITY FULL;
ALTER TABLE event_schedule REPLICA IDENTITY FULL;

-- Row Level Security Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE judging_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_certificates ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_roles_user ON event_roles(user_id);
CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_event_submissions_event ON event_submissions(event_id);
CREATE INDEX idx_submission_evaluations_submission ON submission_evaluations(submission_id);
CREATE INDEX idx_event_announcements_event ON event_announcements(event_id);
CREATE INDEX idx_event_schedule_event ON event_schedule(event_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_event_submissions_updated_at
    BEFORE UPDATE ON event_submissions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_submission_evaluations_updated_at
    BEFORE UPDATE ON submission_evaluations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();