-- Create app_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Turn on RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow public read access" ON public.app_settings
    FOR SELECT TO authenticated USING (true);

-- Allow only admins/super_admins to update
CREATE POLICY "Allow admin update access" ON public.app_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.is_super_admin = true OR profiles.is_admin = true)
        )
    );

-- Insert default settings
INSERT INTO public.app_settings (key, value)
VALUES 
    ('registrations_enabled', 'true'::jsonb),
    ('daily_scan_limit', '5000'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- FUNCTION: Check Global Daily Limit
CREATE OR REPLACE FUNCTION get_global_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    daily_count integer;
    reg_enabled boolean;
    limit_val integer;
BEGIN
    -- Count scans created today (in UTC)
    SELECT COUNT(*) INTO daily_count
    FROM public.usage
    WHERE created_at >= current_date::timestamp;

    -- Get settings
    SELECT (value::text)::boolean INTO reg_enabled FROM public.app_settings WHERE key = 'registrations_enabled';
    SELECT (value::text)::integer INTO limit_val FROM public.app_settings WHERE key = 'daily_scan_limit';

    RETURN json_build_object(
        'daily_scan_count', daily_count,
        'registrations_enabled', COALESCE(reg_enabled, true),
        'daily_scan_limit', COALESCE(limit_val, 5000)
    );
END;
$$;


-- FUNCTION: Trigger to prevent new registrations
CREATE OR REPLACE FUNCTION public.prevent_new_registrations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reg_enabled boolean;
BEGIN
    SELECT (value::text)::boolean INTO reg_enabled FROM public.app_settings WHERE key = 'registrations_enabled';
    
    IF reg_enabled = false THEN
        RAISE EXCEPTION 'Registrations are currently disabled provided by admin.';
    END IF;
    
    RETURN NEW;
END;
$$;

-- DROP trigger if exists first to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created_check_settings ON auth.users;

-- Create Trigger on auth.users
CREATE TRIGGER on_auth_user_created_check_settings
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_new_registrations();


-- FUNCTION: Check Rate Limit for Free Tier
CREATE OR REPLACE FUNCTION check_rate_limit(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    scan_count integer;
BEGIN
    -- Check scans in last 2 minutes
    SELECT COUNT(*) INTO scan_count
    FROM public.usage
    WHERE user_id = check_user_id
    AND created_at >= (now() - interval '2 minutes');

    IF scan_count >= 5 THEN
        RETURN false;
    ELSE
        RETURN true;
    END IF;
END;
$$;
