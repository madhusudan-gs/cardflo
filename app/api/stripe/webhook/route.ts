import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { handleSubscriptionUpdated } from '@/lib/webhook-service';
import { SubscriptionTier } from '@/lib/paywall-service';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;

    try {
        if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
            // Log warning but proceed if in dev/placeholder mode?
            // For production, verification is MANDATORY.
            console.warn('Stripe webhook signature verification skipped (Missing SECRET)');
            event = JSON.parse(body);
        } else {
            event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
        }
    } catch (err: any) {
        console.error('Stripe Webhook Signature Verification Failed:', err.message);
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata.userId;
                const tier = session.metadata.tier as SubscriptionTier;

                if (userId && tier) {
                    await handleSubscriptionUpdated({
                        userId,
                        tier,
                        status: 'active',
                        customerReference: session.customer as string,
                        subscriptionReference: session.subscription as string,
                        provider: 'stripe'
                    });
                }
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const userId = subscription.metadata.userId;
                const tier = subscription.metadata.tier as SubscriptionTier;

                if (userId && tier) {
                    await handleSubscriptionUpdated({
                        userId,
                        tier,
                        status: subscription.status === 'active' ? 'active' :
                            subscription.status === 'canceled' ? 'canceled' : 'past_due',
                        customerReference: subscription.customer as string,
                        subscriptionReference: subscription.id,
                        provider: 'stripe',
                        billingCycleEnd: new Date(subscription.current_period_end * 1000).toISOString()
                    });
                }
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Stripe Webhook Processing Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
