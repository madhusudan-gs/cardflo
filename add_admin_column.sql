-- 1. Add is_admin column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. How to grant admin rights to yourself:
-- Replace 'YOUR_USER_ID' with your actual user ID from the Auth settings or profiles table.
-- UPDATE public.profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';
