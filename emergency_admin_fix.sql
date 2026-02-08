-- CARD FLO: EMERGENCY ADMIN ACCESS RESTORE
-- This script works whether you have 'is_admin' or 'is_super_admin'

-- 1. Ensure both columns exist (to prevent errors)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_super_admin') THEN
        ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Grant access to the most recent user in both columns
UPDATE public.profiles 
SET is_admin = true, is_super_admin = true 
WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

-- Verification
SELECT id, is_admin, is_super_admin FROM public.profiles 
WHERE is_admin = true OR is_super_admin = true;

-- Reload schema
NOTIFY pgrst, 'reload schema';
