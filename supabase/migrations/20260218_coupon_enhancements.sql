-- Add duration_months to coupons table
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS duration_months integer DEFAULT 1;

-- Update redeem_coupon function to handle duration
CREATE OR REPLACE FUNCTION public.redeem_coupon(coupon_code text, target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    coupon_record record;
    usage_record record;
    new_expiry timestamptz;
    bonus_months integer;
BEGIN
    -- 1. Find coupon
    SELECT * INTO coupon_record FROM public.coupons WHERE code = coupon_code;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Invalid coupon code');
    END IF;

    -- 2. Check limits
    IF coupon_record.current_uses >= coupon_record.max_uses THEN
        RETURN json_build_object('success', false, 'message', 'Coupon usage limit reached');
    END IF;

    -- 3. Calculate new expiry (Duration + 1 month buffer)
    bonus_months := COALESCE(coupon_record.duration_months, 1) + 1;
    new_expiry := now() + (bonus_months || ' months')::interval;

    -- 4. Get or Create Usage Record
    SELECT * INTO usage_record FROM public.usage 
    WHERE user_id = target_user_id 
    ORDER BY created_at DESC LIMIT 1;

    IF NOT FOUND THEN
        -- Create new usage record if none exists
        INSERT INTO public.usage (user_id, scans_count, bonus_scans_remaining, cycle_end)
        VALUES (target_user_id, 0, coupon_record.bonus_scans, new_expiry);
    ELSE
        -- Update existing record
        -- Extend cycle_end if the new expiry is further out
        UPDATE public.usage
        SET 
            bonus_scans_remaining = COALESCE(bonus_scans_remaining, 0) + coupon_record.bonus_scans,
            cycle_end = GREATEST(cycle_end, new_expiry)
        WHERE id = usage_record.id;
    END IF;

    -- 5. Increment coupon usage
    UPDATE public.coupons 
    SET current_uses = current_uses + 1 
    WHERE id = coupon_record.id;

    RETURN json_build_object(
        'success', true, 
        'message', 'Coupon redeemed successfully!',
        'bonus_scans', coupon_record.bonus_scans
    );
END;
$$;
