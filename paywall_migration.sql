-- PAYWALL & SUBSCRIPTION MIGRATION
-- Adds tiers, usage tracking, and team support

-- 1. Create Subscription Tier Enum
DO $$ BEGIN
    CREATE TYPE public.subscription_tier AS ENUM ('starter', 'lite', 'standard', 'pro', 'team');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Subscription Status Enum
DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Update Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS subscription_status public.subscription_status DEFAULT 'none',
ADD COLUMN IF NOT EXISTS billing_cycle_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8);

-- 4. Create Usage Table (One entry per user per cycle)
CREATE TABLE IF NOT EXISTS public.usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    cycle_start TIMESTAMPTZ DEFAULT now(),
    cycle_end TIMESTAMPTZ,
    scans_count INTEGER DEFAULT 0,
    bonus_scans_remaining INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, cycle_start)
);

-- 5. Teams Support (Profiles already has team_id in some schemas, let's consolidate)
-- In our schema, leads has team_id, but profiles might need it for pooling
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

-- 6. RLS Policies for Usage
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON public.usage;
CREATE POLICY "Users can view own usage" ON public.usage
    FOR SELECT USING (auth.uid() = user_id);

-- 7. Function to handle referral rewards (Example logic)
CREATE OR REPLACE FUNCTION public.reward_referral(referrer_id UUID, referred_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Grant +5 bonus scans to referrer
    UPDATE public.usage 
    SET bonus_scans_remaining = bonus_scans_remaining + 5
    WHERE user_id = referrer_id AND cycle_end > now();
    
    -- Grant +5 bonus scans to referred user
    UPDATE public.usage 
    SET bonus_scans_remaining = bonus_scans_remaining + 5
    WHERE user_id = referred_id AND cycle_end > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Refresh Postgres schema
NOTIFY pgrst, 'reload schema';
