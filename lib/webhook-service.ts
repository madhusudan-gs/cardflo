import { supabase } from './supabase';
import { SubscriptionTier } from './paywall-service';

export async function handleSubscriptionUpdated({
    userId,
    tier,
    status,
    customerReference, // stripe customer id or razorpay customer id
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

    const { error } = await (supabase
        .from('profiles') as any)
        .update(updateData)
        .eq('id', userId);

    if (error) {
        console.error('[SUBSCRIPTION UPDATE ERROR]', error);
        throw error;
    }

    return { success: true };
}
