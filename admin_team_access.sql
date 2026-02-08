-- CARD FLO: CONSOLIDATED ADMIN & TEAM ACCESS
-- This script ensures all tables and columns exist before applying RLS policies.

-- 1. ENSURE TEAM TABLES EXIST
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- 2. ENSURE PROFILES COLUMNS EXIST
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- 3. ENSURE LEADS/DRAFTS HAVE TEAM_ID
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);
ALTER TABLE public.drafts ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- 4. APPLY RLS POLICIES (WIPE & RECREATE)

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- TEAMS policies
DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;
CREATE POLICY "Admins can view all teams" ON public.teams
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR owner_id = auth.uid()
);

-- TEAM MEMBERS policies
DROP POLICY IF EXISTS "Admins can view all team memberships" ON public.team_members;
CREATE POLICY "Admins can view all team memberships" ON public.team_members
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

-- PROFILES policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR (team_id IS NOT NULL AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()))
  OR id = auth.uid()
);

-- LEADS policies (Enhanced for Super Admin & Team Admin)
DROP POLICY IF EXISTS "Super Admin & Team Admin View" ON public.leads;
CREATE POLICY "Super Admin & Team Admin View" ON public.leads
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR (auth.uid() = created_by)
  OR (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = leads.team_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ))
);

-- 5. FINAL REFRESH
NOTIFY pgrst, 'reload schema';
