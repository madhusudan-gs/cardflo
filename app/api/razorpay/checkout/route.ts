import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpay-server';
import { PAYMENT_CONFIG } from '@/lib/payment-config';
import { SubscriptionTier } from '@/lib/paywall-service';

export async function POST(req: Request) {
    try {
        const { tier, userId, email } = await req.json();

        if (!tier || !userId) {
            return NextResponse.json({ error: 'Missing tier or userId' }, { status: 400 });
        }

        if (tier === 'starter') {
            return NextResponse.json({ error: 'Starter tier is free' }, { status: 400 });
        }

        const planId = PAYMENT_CONFIG.razorpay.plans[tier as keyof typeof PAYMENT_CONFIG.razorpay.plans];

        if (!planId || planId === 'plan_placeholder_id') {
            return NextResponse.json({ error: 'Invalid plan configuration' }, { status: 400 });
        }

        // Create a subscription on Razorpay
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            total_count: 120, // 10 years of monthly billing
            notes: {
                userId: userId,
                tier: tier
            }
        });

        return NextResponse.json({
            subscriptionId: subscription.id,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error: any) {
        console.error('Razorpay checkout error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
