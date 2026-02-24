import { supabaseAdmin } from './supabase-admin';
import { SubscriptionTier } from './paywall-service';

export async function handleSubscriptionUpdated({
    userId,
    tier,
    status,
    customerReference,
    subscriptionReference,
    provider,
    billingCycleEnd
}: {
    userId: string;
    tier: SubscriptionTier;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    customerReference: string;
    subscriptionReference: string;
    provider: 'stripe' | 'razorpay';
    billingCycleEnd?: string;
}) {
    console.log(`[SUBSCRIPTION UPDATE] Provider: ${provider}, User: ${userId}, Tier: ${tier}, Status: ${status}`);

    const updateData: any = {
        subscription_tier: tier,
        subscription_status: status,
        updated_at: new Date().toISOString(),
    };

    if (billingCycleEnd) {
        updateData.billing_cycle_end = billingCycleEnd;
    }

    if (provider === 'stripe') {
        updateData.stripe_customer_id = customerReference;
        updateData.stripe_subscription_id = subscriptionReference;
    } else {
        updateData.razorpay_customer_id = customerReference;
        updateData.razorpay_subscription_id = subscriptionReference;
    }

    // If upgrading to team tier and status is active, auto-provision a team
    if (tier === 'team' && status === 'active') {
        try {
            // Check if user already has a team
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('team_id, email, full_name')
                .eq('id', userId)
                .single();

            if (!profile?.team_id) {
                console.log(`[TEAM PROVISIONING] Creating team for user: ${userId}`);

                // 1. Create the team
                const { data: newTeam, error: teamError } = await supabaseAdmin
                    .from('teams')
                    .insert({
                        name: `${profile?.full_name || profile?.email || 'My'}'s Team`,
                        owner_id: userId,
                    })
                    .select()
                    .single();

                if (teamError || !newTeam) {
                    console.error('[TEAM PROVISIONING ERROR] Failed to create team:', teamError);
                } else {
                    // 2. Add user as owner in team_members
                    const { error: memberError } = await supabaseAdmin
                        .from('team_members')
                        .insert({
                            team_id: newTeam.id,
                            user_id: userId,
                            role: 'owner',
                        });

                    if (memberError) {
                        console.error('[TEAM PROVISIONING ERROR] Failed to add team member:', memberError);
                    } else {
                        // 3. Update profile with new team_id
                        updateData.team_id = newTeam.id;
                        console.log(`[TEAM PROVISIONING] Success. Team ID: ${newTeam.id}`);
                    }
                }
            }
        } catch (e) {
            console.error('[TEAM PROVISIONING] Unexpected error:', e);
        }
    }

    const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

    if (error) {
        console.error('[SUBSCRIPTION UPDATE ERROR]', error);
        throw error;
    }

    return { success: true };
}

