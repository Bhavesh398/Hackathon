-- ==========================================================
-- 🧩 HACKATHON PLATFORM - FULL SUPABASE SCHEMA SETUP
-- Compatible with Supabase SQL Editor
-- ==========================================================

-- 1️⃣ ENUM: registration_status
-- Drop existing enum if you need to re-run this file manually:
-- drop type if exists public.registration_status cascade;
do $$
begin
  if not exists (select 1 from pg_type where typname = 'registration_status') then
    create type public.registration_status as enum ('pending', 'approved', 'rejected');
  end if;
end$$;

-- 2️⃣ TABLE: events
do $$ 
begin
  -- Create the table if it doesn't exist (without event_type initially)
  if not exists (select 1 from pg_tables where tablename = 'events' and schemaname = 'public') then
    create table public.events (
      id uuid primary key default gen_random_uuid(),
      created_at timestamp with time zone default now(),
      created_by uuid references auth.users (id) on delete cascade,

      -- Basic details
      title text not null,
      slug text not null unique,
      description text,
      theme text,
      start_date timestamp with time zone not null,
      end_date timestamp with time zone not null,
      location text,
      is_online boolean default false,

      -- Registration
      registration_deadline timestamp with time zone,
      max_participants integer,
      registration_fee numeric(10,2),
      status text check (status in ('draft', 'published', 'registration_closed', 'completed')) default 'draft',

      -- Teams
      is_team_event boolean default false,
      min_team_size integer default 1,
      max_team_size integer default 1,

      -- Structured fields
      prizes jsonb default '{}'::jsonb,
      metadata jsonb default '{}'::jsonb
    );
  end if;

  -- Add event_type column if it doesn't exist
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'events' 
                 and column_name = 'event_type') then
    alter table public.events 
    add column event_type text;
  end if;

  -- Update all null event_types to 'hackathon'
  update public.events set event_type = 'hackathon' where event_type is null;

  -- Add check constraint if it doesn't exist
  if not exists (select 1 from pg_constraint where conname = 'events_event_type_check') then
    alter table public.events 
    add constraint events_event_type_check 
    check (event_type in ('hackathon', 'workshop', 'conference', 'competition', 'other'));
  end if;

  -- Make event_type not null
  alter table public.events alter column event_type set not null;

exception when others then
  raise notice 'Error setting up event_type column: %', SQLERRM;
end $$;

-- Continue with regular table definition for new installations
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  created_by uuid references auth.users (id) on delete cascade,

  -- Basic details
  title text not null,
  slug text not null unique,
  description text,
  theme text,
  event_type text not null check (event_type in ('hackathon', 'workshop', 'conference', 'competition', 'other')),
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  location text,

  is_online boolean default false,

  -- Registration
  registration_deadline timestamp with time zone,
  max_participants integer,
  registration_fee numeric(10,2),
  status text check (status in ('draft', 'published', 'registration_closed', 'completed')) default 'draft',

  -- Teams
  is_team_event boolean default false,
  min_team_size integer default 1,
  max_team_size integer default 1,

  -- Structured fields
  prizes jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb
);

-- 3️⃣ TABLE: user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  role text check (role in ('organizer', 'judge', 'participant')) not null,
  created_at timestamp with time zone default now()
);

-- 4️⃣ TABLE: event_judges
create table if not exists public.event_judges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete cascade,
  judge_id uuid references auth.users (id) on delete cascade,
  invited_at timestamp with time zone default now(),
  accepted boolean default false
);

do $$ 
begin
  -- Create the table if it doesn't exist
  if not exists (select 1 from pg_tables where tablename = 'event_registrations' and schemaname = 'public') then
    create table public.event_registrations (
      id uuid primary key default gen_random_uuid(),
      created_at timestamp with time zone default now(),
      event_id uuid references public.events (id) on delete cascade,
      user_id uuid references auth.users (id) on delete cascade,

      -- Participant details
      full_name text not null,
      email text not null,
      phone text not null,
      college_name text not null,
      course text not null,
      graduation_year integer not null check (graduation_year between 2020 and 2030),

      -- Optional URLs
      github_url text,
      linkedin_url text,
      portfolio_url text,

      -- Team info
      team_name text,
      why_join text not null,

      -- Registration status
      status public.registration_status default 'pending',

      unique (event_id, user_id)
    );
  else
    -- If table exists, ensure college_name column exists and has correct properties
    if not exists (select 1 from information_schema.columns 
                   where table_schema = 'public' 
                   and table_name = 'event_registrations' 
                   and column_name = 'college_name') then
      alter table public.event_registrations add column college_name text;
    end if;

    -- Set not null constraint if not already set
    begin
      alter table public.event_registrations alter column college_name set not null;
    exception when others then
      raise notice 'Could not set not null constraint on college_name: %', SQLERRM;
    end;
  end if;
end $$;

-- 6️⃣ VIEW: event_record
-- First drop the existing view to avoid column name conflicts
drop view if exists public.event_record;

create view public.event_record as
select
  e.*,
  case
    when e.status = 'published'
      and (e.registration_deadline is null or e.registration_deadline > now())
    then true
    else false
  end as can_register
from public.events e;

-- 7️⃣ FUNCTION: is_registration_open
create or replace function public.is_registration_open(event_id uuid)
returns boolean
language plpgsql
as $$
declare
  event_rec record;
begin
  select * into event_rec from public.events where id = event_id;

  if not found then
    return false;
  end if;

  if event_rec.status = 'published'
     and (event_rec.registration_deadline is null or event_rec.registration_deadline > now())
  then
    return true;
  end if;

  return false;
end;
$$;

-- 8️⃣ FUNCTION: toggle_registration
create or replace function public.toggle_registration(event_id uuid)
returns void
language plpgsql
as $$
begin
  update public.events
  set status = case
    when status = 'published' then 'registration_closed'
    else 'published'
  end
  where id = event_id;
end;
$$;

-- 9️⃣ FUNCTION: generate_slug
create or replace function public.generate_unique_slug(title text)
returns text
language plpgsql
as $$
declare
  base_slug text;
  new_slug text;
  counter integer := 1;
begin
  -- Convert title to lowercase and replace non-alphanumeric chars with hyphens
  base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  
  new_slug := base_slug;
  -- Keep trying with numbered suffixes until we find a unique slug
  while exists (select 1 from public.events where slug = new_slug) loop
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  end loop;
  
  return new_slug;
end;
$$;

-- 🔄 TRIGGER: auto_generate_slug
create or replace function public.handle_event_slug()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    -- For new events, generate a slug from the title
    NEW.slug := public.generate_unique_slug(NEW.title);
  elsif TG_OP = 'UPDATE' and NEW.title <> OLD.title then
    -- If title changed, update the slug
    NEW.slug := public.generate_unique_slug(NEW.title);
  end if;
  return NEW;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'event_slug_trigger') then
    create trigger event_slug_trigger
      before insert or update
      on public.events
      for each row
      execute function public.handle_event_slug();
  end if;
end $$;

-- 🔟 INDEXES
create index if not exists idx_events_created_by on public.events(created_by);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_event_registrations_event_id on public.event_registrations(event_id);
create index if not exists idx_event_registrations_user_id on public.event_registrations(user_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_event_judges_event_id on public.event_judges(event_id);

-- � Initialize slugs for existing events
do $$
declare
  event_rec record;
begin
  for event_rec in select id, title from public.events where slug is null loop
    update public.events
    set slug = public.generate_unique_slug(title)
    where id = event_rec.id;
  end loop;
end;
$$;

-- �🔒 ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_judges enable row level security;
alter table public.user_roles enable row level security;

-- Events RLS policies
do $$ 
begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Public events are viewable by everyone') then
    create policy "Public events are viewable by everyone"
      on public.events for select
      using (status = 'published');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Organizers can manage events') then
    create policy "Organizers can manage events"
      on public.events for all
      using (created_by = auth.uid());
  end if;

  -- Event Registrations RLS policies
  if not exists (select 1 from pg_policies where tablename = 'event_registrations' and policyname = 'Users can view their own registrations') then
    create policy "Users can view their own registrations"
      on public.event_registrations for select
      using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename = 'event_registrations' and policyname = 'Users can register for events') then
    create policy "Users can register for events"
      on public.event_registrations for insert
      with check (auth.uid() = user_id and is_registration_open(event_id));
  end if;

  -- Event Judges RLS policies
  if not exists (select 1 from pg_policies where tablename = 'event_judges' and policyname = 'Judges can view their assigned events') then
    create policy "Judges can view their assigned events"
      on public.event_judges for select
      using (judge_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where tablename = 'event_judges' and policyname = 'Organizers can manage judges') then
    create policy "Organizers can manage judges"
      on public.event_judges for all
      using (exists (
        select 1 from public.events e
        where e.id = event_id and e.created_by = auth.uid()
      ));
  end if;

  -- User Roles RLS policies
  if not exists (select 1 from pg_policies where tablename = 'user_roles' and policyname = 'Users can view roles') then
    create policy "Users can view roles"
      on public.user_roles for select
      using (true);
  end if;

  if not exists (select 1 from pg_policies where tablename = 'user_roles' and policyname = 'System can manage roles') then
    create policy "System can manage roles"
      on public.user_roles for all
      using (auth.uid() = user_id);
  end if;
end $$;

-- ✅ DONE
-- This schema supports:
-- - MyEvents
-- - OrganizeEvent
-- - EventRegistration
-- - Row Level Security (RLS)
