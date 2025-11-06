-- Create event status type
do $$ begin
    create type public.event_status as enum (
        'draft',        -- Initial state when event is being created
        'published',    -- Event is live and accepting registrations
        'registration_closed', -- Registration period has ended
        'ongoing',      -- Event is currently running
        'completed',    -- Event has finished
        'cancelled'     -- Event was cancelled
    );
exception when duplicate_object then null;
end $$;

-- Create event type enum
do $$ begin
    create type public.event_type as enum (
        'hackathon',
        'workshop',
        'competition'
    );
exception when duplicate_object then null;
end $$;

-- Create events table
create table if not exists public.events (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text,
    start_date timestamp with time zone not null,
    end_date timestamp with time zone not null,
    registration_deadline timestamp with time zone,
    max_participants integer,
    event_type public.event_type not null,
    is_paid boolean default false,
    entry_fee numeric(10,2) default 0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    created_by uuid references auth.users(id),
    status public.event_status default 'draft',
    venue text,
    requirements text[],
    prizes jsonb default '{}',
    rules text[],
    tags text[],
    banner_url text,
    is_featured boolean default false,
    min_team_size integer default 1,
    max_team_size integer default 1,
    is_team_event boolean default false
);

-- Create event registrations table
create table if not exists public.event_registrations (
    id uuid default gen_random_uuid() primary key,
    event_id uuid references public.events(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    full_name text not null,
    email text not null,
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
    registration_status text check (registration_status in ('pending', 'approved', 'rejected')) default 'pending',
    payment_status text check (payment_status in ('pending', 'completed', 'failed', 'refunded')) default 'pending',
    payment_id text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    unique(event_id, user_id)
);

-- Add RLS policies
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;

-- Events policies
do $$ begin
create policy "Events are viewable by everyone"
    on public.events for select
    using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
create policy "Events can be created by authenticated users"
    on public.events for insert
    with check (auth.role() = 'authenticated');
exception when duplicate_object then null;
end $$;

do $$ begin
create policy "Events can be updated by creators"
    on public.events for update
    using (auth.uid() = created_by);
exception when duplicate_object then null;
end $$;

-- Registration policies
do $$ begin
create policy "Users can view their own registrations"
    on public.event_registrations for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
create policy "Event admins can view all registrations"
    on public.event_registrations for select
    using (
        exists (
            select 1 from public.events
            where events.id = event_registrations.event_id
            and events.created_by = auth.uid()
        )
    );
exception when duplicate_object then null;
end $$;

do $$ begin
create policy "Users can register themselves"
    on public.event_registrations for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
create policy "Users can update their own registrations"
    on public.event_registrations for update
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Add function to check if event registration is open
-- Ensure the `status` column exists on `public.events` (migration may have created table earlier without it)
alter table public.events
    add column if not exists status public.event_status default 'draft';

create or replace function public.is_registration_open(event_id uuid)
returns boolean as $$
declare
    event_record public.events%rowtype;
begin
    select * into event_record
    from public.events
    where id = event_id;

    if event_record.status != 'published' then
        return false;
    end if;

    if event_record.registration_deadline is not null and 
       event_record.registration_deadline < now() then
        return false;
    end if;

    if event_record.max_participants is not null then
        if (
            select count(*)
            from public.event_registrations
            where event_id = event_record.id
            and registration_status = 'approved'
        ) >= event_record.max_participants then
            return false;
        end if;
    end if;

    return true;
end;
$$ language plpgsql security definer;

-- Create a convenient view `event_record` that exposes the full event row
-- along with a boolean `registration_open` determined by the helper
-- function `public.is_registration_open(event_id)`.
create or replace view public.event_record as
select
    e.*,
    public.is_registration_open(e.id) as registration_open
from public.events e;

-- Grant select on view to authenticated users (optional; adjust as needed)
do $$ begin
    grant select on public.event_record to authenticated;
exception when others then null;
end $$;