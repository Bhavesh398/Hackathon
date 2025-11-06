-- Create registration status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.registration_status AS ENUM (
        'pending',
        'confirmed',
        'rejected',
        'waitlisted',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create event_registrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    team_id uuid NULL, -- For team events
    status public.registration_status DEFAULT 'pending' NOT NULL,
    registration_data jsonb DEFAULT '{}'::jsonb, -- Flexible storage for additional registration data
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(event_id, user_id) -- Prevent duplicate registrations
);

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'event_registrations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.event_registrations 
        ADD COLUMN status public.registration_status DEFAULT 'pending' NOT NULL;
    END IF;
END $$;

-- Add RLS policies
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own registrations"
    ON public.event_registrations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own registrations"
    ON public.event_registrations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
    ON public.event_registrations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);