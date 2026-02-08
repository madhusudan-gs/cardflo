-- CARD FLO: COUPON SYSTEM SCHEMA

-- 1. Create Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    bonus_scans INTEGER NOT NULL DEFAULT 10,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Only Super Admins can manage coupons
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons
FOR ALL USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- Anyone can select (to validate during redemption)
DROP POLICY IF EXISTS "Public can view coupons for validation" ON public.coupons;
CREATE POLICY "Public can view coupons for validation" ON public.coupons
FOR SELECT USING (true);

-- 4. Function to Redeem Coupon
CREATE OR REPLACE FUNCTION public.redeem_coupon(coupon_code TEXT, target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    coupon_record RECORD;
    usage_record RECORD;
BEGIN
    -- 1. Validate Coupon
    SELECT * INTO coupon_record FROM public.coupons 
    WHERE code = coupon_code 
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Invalid or expired coupon');
    END IF;

    -- 2. Find Current Usage Record
    SELECT id INTO usage_record FROM public.usage 
    WHERE user_id = target_user_id 
    AND (cycle_end IS NULL OR cycle_end > now())
    ORDER BY created_at DESC 
    LIMIT 1;

    IF NOT FOUND THEN
        -- Create a fresh usage record if none exists
        INSERT INTO public.usage (user_id, scans_count, bonus_scans_remaining)
        VALUES (target_user_id, 0, coupon_record.bonus_scans);
    ELSE
        -- Update existing usage
        UPDATE public.usage 
        SET bonus_scans_remaining = bonus_scans_remaining + coupon_record.bonus_scans
        WHERE id = usage_record.id;
    END IF;

    -- 3. Increment Coupon Uses
    UPDATE public.coupons 
    SET current_uses = current_uses + 1
    WHERE id = coupon_record.id;

    RETURN json_build_object('success', true, 'message', 'Coupon redeemed successfully', 'bonus_scans', coupon_record.bonus_scans);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
