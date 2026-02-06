-- CARD FLO CONSOLIDATED SCHEMA (Run in Supabase SQL Editor)

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. LEADS TABLE (The permanent storage)
create table if not exists public.leads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) not null,
  
  first_name text,
  last_name text,
  job_title text,
  company text,
  email text,
  phone text,
  website text,
  address text,
  notes text,
  image_url text,
  back_image_url text,
  scanned_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. DRAFTS TABLE (Temporary storage)
create table if not exists public.drafts (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id) not null,
  
  first_name text,
  last_name text,
  job_title text,
  company text,
  email text,
  phone text,
  website text,
  address text,
  notes text,
  image_url text,
  back_image_url text,
  scanned_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Enable Row Level Security
alter table public.leads enable row level security;
alter table public.drafts enable row level security;

-- 5. Leads Policies
drop policy if exists "Users can view own leads" on public.leads;
create policy "Users can view own leads" on public.leads for select using (auth.uid() = created_by);

drop policy if exists "Users can insert own leads" on public.leads;
create policy "Users can insert own leads" on public.leads for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own leads" on public.leads;
create policy "Users can update own leads" on public.leads for update using (auth.uid() = created_by);

drop policy if exists "Users can delete own leads" on public.leads;
create policy "Users can delete own leads" on public.leads for delete using (auth.uid() = created_by);

-- 6. Drafts Policies
drop policy if exists "Users can view own drafts" on public.drafts;
create policy "Users can view own drafts" on public.drafts for select using (auth.uid() = created_by);

drop policy if exists "Users can insert own drafts" on public.drafts;
create policy "Users can insert own drafts" on public.drafts for insert with check (auth.uid() = created_by);

drop policy if exists "Users can delete own drafts" on public.drafts;
create policy "Users can delete own drafts" on public.drafts for delete using (auth.uid() = created_by);
