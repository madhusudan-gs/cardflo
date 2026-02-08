-- CARD FLO: GRANT SUPER ADMIN ACCESS
-- Run this in your Supabase SQL Editor

-- OPTION 1: Grant to the most recently registered user (Recommended for testing)
UPDATE public.profiles 
SET is_admin = true 
WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

-- OPTION 2: Grant to a specific email (If you know the email)
-- UPDATE public.profiles 
-- SET is_admin = true 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- OPTION 3: Manual ID (Precision method)
-- UPDATE public.profiles SET is_admin = true WHERE id = 'YOUR_UUID_HERE';

-- Verification
SELECT id, is_admin, team_id FROM public.profiles WHERE is_admin = true;

-- Reload schema to ensure policies reflect changes
NOTIFY pgrst, 'reload schema';
