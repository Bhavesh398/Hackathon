create table if not exists event_roles (
    id uuid default uuid_generate_v4() primary key,
    event_id uuid not null,
    user_id uuid not null,
    role text check (role in ('admin', 'judge', 'participant')) not null,
    created_at timestamptz default now(),
    unique(event_id, user_id)
);

create table if not exists event_invitations (
    id uuid default uuid_generate_v4() primary key,
    event_id uuid not null,
    invited_email text not null,
    invited_by uuid not null,
    role text check (role in ('admin', 'judge', 'participant')) not null,
    status text check (status in ('pending', 'accepted', 'rejected')) not null default 'pending',
    created_at timestamptz default now(),
    unique(event_id, invited_email)
);