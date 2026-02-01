-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade
);

-- TEAMS TABLE
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  owner_id uuid references public.profiles(id) not null
);

-- TEAM MEMBERS TABLE
create table public.team_members (
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text check (role in ('owner', 'admin', 'member')) default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (team_id, user_id)
);

-- LEADS TABLE (The Business Cards)
create table public.leads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references public.profiles(id) not null,
  team_id uuid references public.teams(id), -- Nullable: If null, it's a personal lead
  
  first_name text,
  last_name text,
  job_title text,
  company text,
  email text,
  phone text,
  website text,
  address text,
  notes text,
  image_url text -- URL to the card image in Storage
);

-- RLS POLICIES --

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.leads enable row level security;

-- Profiles: View/Edit own profile
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Handle Profile Creation trigger
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Leads: 
-- 1. Users can CRUD their own PERSONAL leads (team_id is null)
create policy "Users can CRUD own personal leads" on public.leads
  for all using (auth.uid() = created_by and team_id is null);

-- 2. Team Access (Simplified for v1: Members can view all leads in their team)
create policy "Team members can view team leads" on public.leads
  for select using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = leads.team_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Team members can create team leads" on public.leads
  for insert with check (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = leads.team_id
      and tm.user_id = auth.uid()
    )
  );
