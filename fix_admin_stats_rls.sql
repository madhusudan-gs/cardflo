-- CARD FLO: ADMIN STATS RLS FIX
-- This ensures the Super Admin can see ALL leads and usage data for stats.

-- 1. LEADS RLS (Super Admin Bypass)
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
CREATE POLICY "Admins can view all leads" ON public.leads
FOR SELECT USING (
  public.check_is_admin() -- Use the recursion-safe function we created
  OR auth.uid() = created_by 
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = leads.team_id
    AND tm.user_id = auth.uid()
  )
);

-- 2. USAGE RLS (Super Admin Bypass)
-- If usage table has RLS, admins need to see it for MRR calculations
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all usage" ON public.usage;
CREATE POLICY "Admins can view all usage" ON public.usage
FOR SELECT USING (
  public.check_is_admin()
  OR auth.uid() = user_id
);

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
