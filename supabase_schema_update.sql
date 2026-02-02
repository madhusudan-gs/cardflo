-- DRAFTS TABLE (Temporary storage before confirmation)
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
  image_url text
);

-- Enable RLS
alter table public.drafts enable row level security;

-- Policies
create policy "Users can view own drafts" on public.drafts
  for select using (auth.uid() = created_by);

create policy "Users can insert own drafts" on public.drafts
  for insert with check (auth.uid() = created_by);

create policy "Users can update own drafts" on public.drafts
  for update using (auth.uid() = created_by);

create policy "Users can delete own drafts" on public.drafts
  for delete using (auth.uid() = created_by);
