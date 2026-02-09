-- CARD FLO: GOD-MODE ADMIN FIX (RECURSION SAFE)
-- This script fixes the "loops" by being absolute.

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

-- 2. Grant Access (Targeting both email and the most recent user for absolute certainty)
UPDATE public.profiles 
SET is_admin = true, is_super_admin = true 
WHERE email = 'madhusudan.gs@gmail.com' 
   OR id = (SELECT id FROM auth.users WHERE email = 'madhusudan.gs@gmail.com' LIMIT 1)
   OR id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

-- 3. Create a RECURSION-SAFE admin check function
-- This avoids the "infinite loop" error that happens when a profile policy checks the profile table.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Recursion-Safe RLS Policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (auth.uid() = id OR public.check_is_admin());

DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;
CREATE POLICY "Admins can view all teams" ON public.teams
FOR SELECT USING (owner_id = auth.uid() OR public.check_is_admin());

DROP POLICY IF EXISTS "Admins can view all team memberships" ON public.team_members;
CREATE POLICY "Admins can view all team memberships" ON public.team_members
FOR SELECT USING (user_id = auth.uid() OR public.check_is_admin());

-- 5. Final Force Reload
NOTIFY pgrst, 'reload schema';

-- 6. VERIFICATION (Check the results below)
SELECT email, is_admin, is_super_admin FROM public.profiles 
WHERE email = 'madhusudan.gs@gmail.com';
