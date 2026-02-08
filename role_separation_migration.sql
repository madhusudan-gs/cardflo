-- CARD FLO: ADMIN ROLE SEPARATION MIGRATION
-- 1. Rename column for clarity
ALTER TABLE public.profiles 
RENAME COLUMN is_admin TO is_super_admin;

-- 2. Helper function to check for Team Admin status
-- A Team Admin is anyone with the role 'owner' or 'admin' in a specific team.
CREATE OR REPLACE FUNCTION public.is_team_admin(target_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_id = target_team_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    ) OR (
        SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update TEAM_MEMBERS RLS Policies
-- Allow Team Admins to view members
DROP POLICY IF EXISTS "Admins can view all team memberships" ON public.team_members;
CREATE POLICY "Team Members View Access" ON public.team_members
FOR SELECT USING (
  (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

-- Allow Team Admins to ADD members
DROP POLICY IF EXISTS "Team Admins can add members" ON public.team_members;
CREATE POLICY "Team Admins can add members" ON public.team_members
FOR INSERT WITH CHECK (
    public.is_team_admin(team_id)
);

-- Allow Team Admins to DELETE members
DROP POLICY IF EXISTS "Team Admins can delete members" ON public.team_members;
CREATE POLICY "Team Admins can delete members" ON public.team_members
FOR DELETE USING (
    public.is_team_admin(team_id)
    AND (
        -- Owners cannot be deleted by other Admins (only by themselves or Super Admin)
        role != 'owner' 
        OR user_id = auth.uid() 
        OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
    )
);

-- 4. Update other policies to use is_super_admin
-- Example for TEAMS
DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;
CREATE POLICY "Admins/Owners View Teams" ON public.teams
FOR SELECT USING (
  (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR owner_id = auth.uid()
);

-- 5. Final Refresh
NOTIFY pgrst, 'reload schema';
