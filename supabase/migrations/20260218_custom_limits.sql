-- Add custom_scan_limit to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS custom_scan_limit integer DEFAULT NULL;

-- Allow admins to update this column (if RLS policies exist for it)
-- Note: Existing RLS usually covers 'UPDATE' based on user role or ownership.
-- We might need a policy if supers want to update others.
-- For now, the implementation assumes the updater is a Super Admin who often has bypass rights or specific policies.
