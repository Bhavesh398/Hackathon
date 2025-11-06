-- Add missing columns to events table that weren't in the main migration
alter table public.events 
add column if not exists registration_deadline timestamptz,
add column if not exists event_type text check (event_type in ('hackathon', 'workshop', 'competition')),
add column if not exists is_paid boolean default false,
add column if not exists entry_fee numeric(10,2) default 0,
add column if not exists prizes jsonb default '{}'::jsonb,
add column if not exists min_team_size integer default 1,
add column if not exists max_team_size integer default 1,
add column if not exists is_team_event boolean default false,
add column if not exists updated_at timestamptz default now();

-- Add missing columns to event_registrations that weren't in the main migration
alter table public.event_registrations 
add column if not exists email text,
add column if not exists college_name text,
add column if not exists course text,
add column if not exists graduation_year integer,
add column if not exists skills text[],
add column if not exists github_url text,
add column if not exists linkedin_url text,
add column if not exists portfolio_url text,
add column if not exists why_join text,
add column if not exists payment_status text check (payment_status in ('pending', 'completed', 'failed', 'refunded')),
add column if not exists payment_id text,
add column if not exists updated_at timestamptz default now();

-- Add constraints
alter table public.events 
add constraint valid_team_size 
  check (min_team_size <= max_team_size and min_team_size >= 1);

alter table public.events 
add constraint valid_dates 
  check (start_date <= end_date and (registration_deadline is null or registration_deadline <= start_date));

-- Create helper function to get event capacity
create or replace function public.get_event_capacity(event_id uuid)
returns table (
  total_capacity integer,
  registered_count integer,
  approved_count integer,
  pending_count integer,
  rejected_count integer,
  available_slots integer
) as $$
begin
  return query
  select
    e.max_participants as total_capacity,
    count(er.id) as registered_count,
    count(er.id) filter (where er.registration_status = 'approved') as approved_count,
    count(er.id) filter (where er.registration_status = 'pending') as pending_count,
    count(er.id) filter (where er.registration_status = 'rejected') as rejected_count,
    e.max_participants - count(er.id) filter (where er.registration_status in ('approved', 'pending')) as available_slots
  from public.events e
  left join public.event_registrations er on er.event_id = e.id
  where e.id = event_id
  group by e.max_participants;
end;
$$ language plpgsql security definer;

-- Create trigger to update the updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add triggers for updated_at
create trigger set_timestamp_events
  before update on public.events
  for each row
  execute function update_updated_at_column();

create trigger set_timestamp_registrations
  before update on public.event_registrations
  for each row
  execute function update_updated_at_column();