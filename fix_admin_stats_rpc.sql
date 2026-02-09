-- CARD FLO: SUPER ADMIN ANALYTICS FIX (RPC)
-- This script creates a single, high-performance function to fetch all stats,
-- bypassing RLS restrictions for Super Admins.

-- 1. Create the secure summary function
CREATE OR REPLACE FUNCTION public.get_admin_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
    caller_is_admin BOOLEAN;
BEGIN
    -- Security Check: Ensure the caller has admin rights
    SELECT (is_admin = true OR is_super_admin = true) INTO caller_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF caller_is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admins can access platform analytics.';
    END IF;

    -- Aggregate all data in one go
    SELECT json_build_object(
        'totalUsers', (SELECT count(*) FROM public.profiles),
        'totalLeads', (SELECT count(*) FROM public.leads),
        'activeSubscriptions', (SELECT count(*) FROM public.profiles WHERE subscription_status = 'active'),
        'planBreakdown', (
            SELECT json_object_agg(tier, count)
            FROM (
                SELECT COALESCE(subscription_tier, 'starter') as tier, count(*) as count 
                FROM public.profiles 
                GROUP BY tier
            ) t
        ),
        'estimatedMRR', (
            SELECT SUM(
                CASE 
                    WHEN subscription_tier = 'lite' THEN 9
                    WHEN subscription_tier = 'standard' THEN 19
                    WHEN subscription_tier = 'pro' THEN 49
                    WHEN subscription_tier = 'team' THEN 99
                    ELSE 0 
                END
            )
            FROM public.profiles
            WHERE subscription_status = 'active'
        ),
        'recentUsers', (
            SELECT json_agg(u)
            FROM (
                SELECT id, email, subscription_tier, subscription_status, updated_at 
                FROM public.profiles 
                ORDER BY updated_at DESC 
                LIMIT 10
            ) u
        ),
        'recentLeads', (
            SELECT json_agg(l)
            FROM (
                SELECT id, first_name, last_name, company, created_at 
                FROM public.leads 
                ORDER BY created_at DESC 
                LIMIT 10
            ) l
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_admin_summary() TO authenticated;

-- 3. FINAL PERMISSION CHECK (Ensure profile access is recursion-free)
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

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (auth.uid() = id OR public.check_is_admin());

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
