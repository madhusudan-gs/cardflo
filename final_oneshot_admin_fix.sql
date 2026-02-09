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

-- 2. Grant Access to Your Specific Email (Force both columns to be sure)
UPDATE public.profiles 
SET is_admin = true, is_super_admin = true 
WHERE email = 'madhusudan.gs@gmail.com';

-- 3. Update RLS Policies to be Ultra-Resilient
-- This ensures that if ANY of the admin flags are true, you get access.
DO $$
BEGIN
    -- PROFILES
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
      OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
      OR id = auth.uid()
    );

    -- TEAMS
    DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;
    CREATE POLICY "Admins can view all teams" ON public.teams
    FOR SELECT USING (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
      OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
      OR owner_id = auth.uid()
    );

    -- TEAM_MEMBERS
    DROP POLICY IF EXISTS "Admins can view all team memberships" ON public.team_members;
    CREATE POLICY "Admins can view all team memberships" ON public.team_members
    FOR SELECT USING (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
      OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
      OR team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
    );

    -- COUPONS
    DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
    CREATE POLICY "Admins can manage coupons" ON public.coupons
    FOR ALL USING (
      (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
      OR (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true
    );
END $$;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';

-- 5. FINAL CONFIRMATION (Run this and look at the results)
SELECT id, email, is_admin, is_super_admin 
FROM public.profiles 
WHERE email = 'madhusudan.gs@gmail.com';
