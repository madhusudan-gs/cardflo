
import { supabase } from './supabase';
import { Lead } from './types';

export type SubscriptionTier = 'starter' | 'lite' | 'standard' | 'pro' | 'team';

export interface PlanLimits {
    scanLimit: number;
    allowExport: boolean;
    teamMembers: number;
}

export const PLAN_CONFIGS: Record<SubscriptionTier, PlanLimits> = {
    starter: { scanLimit: 5, allowExport: false, teamMembers: 1 },
    lite: { scanLimit: 30, allowExport: true, teamMembers: 1 },
    standard: { scanLimit: 120, allowExport: true, teamMembers: 1 },
    pro: { scanLimit: 500, allowExport: true, teamMembers: 1 },
    team: { scanLimit: 500, allowExport: true, teamMembers: 5 },
};

export async function getUserUsage(userId: string) {
    const { data, error } = await supabase
        .from('usage')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching usage:', error);
        return null;
    }

    return data as any;
}

export async function getUserProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            subscription_tier, 
            subscription_status, 
            team_id, 
            billing_cycle_end,
            stripe_customer_id,
            stripe_subscription_id,
            razorpay_customer_id,
            razorpay_subscription_id,
            referral_code,
            is_admin
        `)
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data as any;
}

export async function canScan(userId: string): Promise<{ allowed: boolean; reason?: 'limit_reached' | 'error'; warning?: boolean }> {
    try {
        const profile = await getUserProfile(userId);
        if (!profile) return { allowed: false, reason: 'error' };

        // Super Admin Bypass: Always allow scans
        if ((profile as any).is_admin) {
            return { allowed: true };
        }

        const tier = (profile.subscription_tier as SubscriptionTier) || 'starter';
        const config = PLAN_CONFIGS[tier];

        const usage = await getUserUsage(userId);

        // If no usage record exists for this cycle, they are allowed (will be created on first scan)
        if (!usage) return { allowed: true };

        // Check if cycle has ended (Simple client-side safety, though SQL/Backend should handle reset)
        if (usage.cycle_end && new Date(usage.cycle_end) < new Date()) {
            return { allowed: true }; // Cycle reset needed
        }

        const totalScans = (usage as any).scans_count || 0;
        const bonusScans = (usage as any).bonus_scans_remaining || 0;
        const totalLimit = config.scanLimit + bonusScans;

        if (totalScans >= totalLimit) {
            return { allowed: false, reason: 'limit_reached' };
        }

        // 80% Warning
        const warningThreshold = totalLimit * 0.8;
        if (totalScans >= warningThreshold) {
            return { allowed: true, warning: true };
        }

        return { allowed: true };
    } catch (error) {
        console.error('canScan check failed:', error);
        return { allowed: true }; // Default to allow in case of logic error to not block users
    }
}

export async function incrementUsage(userId: string) {
    // 1. Check for profile billing cycle
    const profile = await getUserProfile(userId);
    const cycleEnd = (profile as any)?.billing_cycle_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: usage } = await supabase
        .from('usage')
        .select('id, scans_count, cycle_end')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    // 2. If usage exists and is in current cycle, update it
    if (usage && (!(usage as any).cycle_end || new Date((usage as any).cycle_end) > new Date())) {
        const updateData = { scans_count: ((usage as any).scans_count || 0) + 1 };
        await (supabase.from('usage') as any)
            .update(updateData)
            .eq('id', (usage as any).id);
    } else {
        // 3. Create new usage record for new cycle
        await supabase
            .from('usage')
            .insert({
                user_id: userId,
                scans_count: 1,
                cycle_start: new Date().toISOString(),
                cycle_end: cycleEnd
            } as any);
    }
}
