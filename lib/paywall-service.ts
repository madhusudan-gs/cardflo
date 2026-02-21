
import { supabase } from './supabase';

export type SubscriptionTier = 'starter' | 'lite' | 'standard' | 'pro' | 'team';

export interface PlanLimits {
    scanLimit: number;
    allowExport: boolean;
    teamMembers: number;
}

export const PLAN_CONFIGS: Record<SubscriptionTier, PlanLimits> = {
    starter: { scanLimit: 10, allowExport: false, teamMembers: 1 },
    lite: { scanLimit: 40, allowExport: true, teamMembers: 1 },
    standard: { scanLimit: 150, allowExport: true, teamMembers: 1 },
    pro: { scanLimit: 600, allowExport: true, teamMembers: 1 },
    team: { scanLimit: 1000, allowExport: true, teamMembers: 5 },
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

    return data;
}

export async function getUserProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
}

export async function canScan(userId: string): Promise<{ allowed: boolean; reason?: 'limit_reached' | 'error' | 'global_limit_reached' | 'rate_limit_exceeded'; warning?: boolean }> {
    try {
        // 1. Check Global Limits
        const { data: globalStats, error: globalError } = await supabase.rpc('get_global_stats');

        if (!globalError && globalStats) {
            const stats = globalStats as { daily_scan_count: number; daily_scan_limit: number };
            if (stats.daily_scan_count >= stats.daily_scan_limit) {
                return { allowed: false, reason: 'global_limit_reached' };
            }
        }

        const profile = await getUserProfile(userId);
        if (!profile) return { allowed: false, reason: 'error' };

        // Super Admin Bypass
        if (profile.is_admin) {
            return { allowed: true };
        }

        const tier = (profile.subscription_tier as SubscriptionTier) || 'starter';

        // 2. Check Rate Limit (Free Tier Only)
        if (tier === 'starter') {
            const { data: isRateAllowed, error: rateError } = await supabase.rpc('check_rate_limit', { check_user_id: userId });
            if (!rateError && isRateAllowed === false) {
                return { allowed: false, reason: 'rate_limit_exceeded' };
            }
        }

        const config = PLAN_CONFIGS[tier];

        const usage = await getUserUsage(userId);

        // If no usage record exists for this cycle, they are allowed (will be created on first scan)
        if (!usage) return { allowed: true };

        // Check if cycle has ended (Simple client-side safety, though SQL/Backend should handle reset)
        if (usage.cycle_end && new Date(usage.cycle_end) < new Date()) {
            return { allowed: true }; // Cycle reset needed
        }

        const totalScans = usage.scans_count || 0;
        const bonusScans = usage.bonus_scans_remaining || 0;
        const limitConfig = (profile as any).custom_scan_limit ?? config.scanLimit;
        const totalLimit = limitConfig + bonusScans;

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
    const cycleEnd = profile?.billing_cycle_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: usage } = await supabase
        .from('usage')
        .select('id, scans_count, cycle_end')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    // 2. If usage exists and is in current cycle, update it
    if (usage && (!usage.cycle_end || new Date(usage.cycle_end) > new Date())) {
        const updateData = { scans_count: (usage.scans_count || 0) + 1 };
        await supabase.from('usage')
            .update(updateData)
            .eq('id', usage.id);
    } else {
        // 3. Create new usage record for new cycle
        await supabase
            .from('usage')
            .insert({
                user_id: userId,
                scans_count: 1,
                cycle_start: new Date().toISOString(),
                cycle_end: cycleEnd
            });
    }
}

export async function redeemCoupon(userId: string, code: string): Promise<{ success: boolean; message: string; bonus_scans?: number }> {
    try {
        const { data, error } = await supabase.rpc('redeem_coupon', {
            coupon_code: code,
            target_user_id: userId
        });

        if (error) {
            console.error('Coupon redemption error:', error);
            return { success: false, message: error.message };
        }

        return data as { success: boolean; message: string; bonus_scans?: number };
    } catch (err: any) {
        console.error('Coupon redemption catch:', err);
        return { success: false, message: 'Unexpected error during redemption' };
    }
}

export async function toggleRegistrations(enabled: boolean) {
    const { error } = await supabase
        .from('app_settings')
        .update({ value: enabled, updated_at: new Date().toISOString() })
        .eq('key', 'registrations_enabled');

    return !error;
}

export async function getGlobalSettings() {
    const { data } = await supabase.rpc('get_global_stats');
    return data as { daily_scan_count: number; registrations_enabled: boolean; daily_scan_limit: number };
}
