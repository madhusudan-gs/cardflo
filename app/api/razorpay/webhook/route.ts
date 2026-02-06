import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleSubscriptionUpdated } from '@/lib/webhook-service';
import { SubscriptionTier } from '@/lib/paywall-service';

export async function POST(req: Request) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // Verify signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.error('Razorpay Webhook Signature Verification Failed');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }
    }

    const event = JSON.parse(rawBody);

    try {
        const subscription = event.payload.subscription.entity;
        const notes = subscription.notes;
        const userId = notes.userId;
        const tier = notes.tier as SubscriptionTier;

        if (!userId || !tier) {
            console.warn('Razorpay Webhook: Missing userId or tier in notes');
            return NextResponse.json({ received: true }); // Acknowledge to stop retries
        }

        switch (event.event) {
            case 'subscription.charged':
                await handleSubscriptionUpdated({
                    userId,
                    tier,
                    status: 'active',
                    customerReference: subscription.customer_id,
                    subscriptionReference: subscription.id,
                    provider: 'razorpay',
                    billingCycleEnd: new Date(subscription.charge_at * 1000).toISOString()
                });
                break;
            case 'subscription.cancelled':
                await handleSubscriptionUpdated({
                    userId,
                    tier,
                    status: 'canceled',
                    customerReference: subscription.customer_id,
                    subscriptionReference: subscription.id,
                    provider: 'razorpay'
                });
                break;
            case 'subscription.halted':
                await handleSubscriptionUpdated({
                    userId,
                    tier,
                    status: 'past_due',
                    customerReference: subscription.customer_id,
                    subscriptionReference: subscription.id,
                    provider: 'razorpay'
                });
                break;
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Razorpay Webhook Processing Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
