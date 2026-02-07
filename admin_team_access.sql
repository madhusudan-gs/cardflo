-- Admin & Team Access Migration

-- 1. PROFILES: Allow admins to see all, AND Team Admins to see their teammates
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR 
  (team_id IS NOT NULL AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()))
);

-- 2. LEADS: Allow admins to see all, AND Team Admins to see team leads
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
CREATE POLICY "Admins can view all leads" ON public.leads
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR 
  (team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = leads.team_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ))
);

-- 3. TEAMS: Allow admins to see all, AND owners to see own team
DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;
CREATE POLICY "Admins can view all teams" ON public.teams
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR 
  owner_id = auth.uid()
);

-- 4. TEAM MEMBERS: Allow admins to see all memberships
DROP POLICY IF EXISTS "Admins can view all team memberships" ON public.team_members;
CREATE POLICY "Admins can view all team memberships" ON public.team_members
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- 5. STORAGE: (If bucket policies exist) Ensure admins can view lead images
-- This usually requires bucket-level policies if RLS is enabled for storage.objects
