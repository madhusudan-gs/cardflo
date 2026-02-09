-- CARD FLO: FINAL ONE-SHOT ADMIN FIX
-- This script ensures you have access regardless of which column version you are on.

-- 1. Ensure Columns Exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_super_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Grant Access to Latest User (You)
UPDATE public.profiles 
SET is_admin = true, is_super_admin = true 
WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

-- 3. Update RLS Policies to be Resilient (Support both columns)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR (team_id IS NOT NULL AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()))
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;
CREATE POLICY "Admins can view all teams" ON public.teams
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can view all team memberships" ON public.team_members;
CREATE POLICY "Admins can view all team memberships" ON public.team_members
FOR SELECT USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
  OR team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

-- 5. Verification Check (Look at the output below in Supabase)
SELECT id, email, is_admin, is_super_admin FROM public.profiles 
WHERE is_admin = true OR is_super_admin = true;
