-- Migration: 20251107_my_events_schema.sql
-- Purpose: Create/ensure events + event_registrations schema, enums, triggers, RLS and helper functions.
-- Safety: idempotent (uses DO blocks / IF NOT EXISTS where appropriate). Review before applying in production.

-- 0) Drop existing tables and views (if they exist)
DROP VIEW IF EXISTS public.event_record;
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;

-- 1) Create enums safely
DO $$ BEGIN
  CREATE TYPE public.event_status AS ENUM ('draft','published','registration_closed','ongoing','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.event_type AS ENUM ('hackathon','workshop','competition','meetup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.registration_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Create events table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  registration_deadline timestamptz,
  max_participants integer,
  event_type public.event_type NOT NULL DEFAULT 'hackathon',
  is_paid boolean DEFAULT false,
  registration_fee numeric(10,2) DEFAULT 0 CHECK (registration_fee >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.event_status DEFAULT 'draft',
  location text,
  venue text,
  venue_address text,
  is_online boolean DEFAULT false,
  is_team_event boolean DEFAULT false,
  min_team_size integer DEFAULT 1,
  max_team_size integer DEFAULT 1,
  banner_url text,
  tags text[],
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 3) Create event_registrations table
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  college_name text,
  course text,
  graduation_year integer,
  skills text[],
  github_url text,
  linkedin_url text,
  portfolio_url text,
  team_name text,
  why_join text,
  registration_status public.registration_status DEFAULT 'pending',
  payment_status text DEFAULT 'pending',
  payment_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- 4) Updated-at trigger function & trigger (idempotent)
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_events'
  ) THEN
    CREATE TRIGGER set_timestamp_events
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE PROCEDURE public.trigger_set_timestamp();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_registrations'
  ) THEN
    CREATE TRIGGER set_timestamp_registrations
    BEFORE UPDATE ON public.event_registrations
    FOR EACH ROW
    EXECUTE PROCEDURE public.trigger_set_timestamp();
  END IF;
END $$;

-- 5) Indexes to speed up common queries
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
  CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
  CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.event_registrations(event_id);
END $$;

-- 6) Enable Row Level Security (safe to run; policies added below)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- 7) RLS Policies (created idempotently)
DO $$ BEGIN
  BEGIN
    CREATE POLICY events_public_select ON public.events FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    CREATE POLICY events_insert_authenticated ON public.events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    CREATE POLICY events_update_by_creator ON public.events FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    CREATE POLICY events_delete_by_creator ON public.events FOR DELETE USING (auth.uid() = created_by);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    CREATE POLICY registrations_select_user ON public.event_registrations FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    CREATE POLICY registrations_select_event_admin ON public.event_registrations FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_registrations.event_id AND e.created_by = auth.uid())
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    CREATE POLICY registrations_insert_self ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    CREATE POLICY registrations_update_self ON public.event_registrations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 8) Helper function: is_registration_open(event_id)
CREATE OR REPLACE FUNCTION public.is_registration_open(event_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  e public.events%ROWTYPE;
  approved_count int;
BEGIN
  SELECT * INTO e FROM public.events WHERE id = event_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Only 'published' status allows registrations
  IF e.status IS NULL OR e.status != 'published' THEN
    RETURN false;
  END IF;

  IF e.registration_deadline IS NOT NULL AND e.registration_deadline < now() THEN
    RETURN false;
  END IF;

  IF e.max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO approved_count FROM public.event_registrations WHERE event_id = e.id AND registration_status = 'approved';
    IF approved_count >= e.max_participants THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- 9) Create view event_record that includes registration_open boolean
-- Drop and recreate view to avoid column name conflicts
DROP VIEW IF EXISTS public.event_record;
CREATE VIEW public.event_record AS
SELECT
  e.id,
  e.title,
  e.description,
  e.start_date,
  e.end_date,
  e.registration_deadline,
  e.max_participants,
  e.event_type,
  e.is_paid,
  e.registration_fee,
  e.created_at,
  e.updated_at,
  e.created_by,
  e.status,
  e.location,
  e.venue,
  e.venue_address,
  e.is_online,
  e.is_team_event,
  e.min_team_size,
  e.max_team_size,
  e.banner_url,
  e.tags,
  e.metadata,
  public.is_registration_open(e.id) AS registration_open
FROM public.events e;

-- 10) Grants: let authenticated users access needed resources
DO $$ BEGIN
  BEGIN
    GRANT SELECT ON public.event_record TO authenticated;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN 
    GRANT ALL ON public.events TO authenticated;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    GRANT ALL ON public.event_registrations TO authenticated;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 11) Note: Before applying to production, BACKUP your DB or run the following to snapshot relevant tables:
--   CREATE TABLE backup_events AS TABLE public.events WITH NO DATA;
--   INSERT INTO backup_events SELECT * FROM public.events;
--   CREATE TABLE backup_event_registrations AS TABLE public.event_registrations WITH NO DATA;
--   INSERT INTO backup_event_registrations SELECT * FROM public.event_registrations;

-- End of migration
