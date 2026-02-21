import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-server';
import { PAYMENT_CONFIG } from '@/lib/payment-config';
import { SubscriptionTier } from '@/lib/paywall-service';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const supabase = createClient();
        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (!authSession) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tier } = await req.json();
        const userId = authSession.user.id;
        const email = authSession.user.email;

        if (!tier || !userId || !email) {
            return NextResponse.json({ error: 'Missing required checkout data' }, { status: 400 });
        }

        if (tier === 'starter') {
            return NextResponse.json({ error: 'Starter tier is free' }, { status: 400 });
        }

        const priceId = PAYMENT_CONFIG.stripe.prices[tier as keyof typeof PAYMENT_CONFIG.stripe.prices];

        if (!priceId || priceId === 'price_placeholder_id') {
            return NextResponse.json({ error: 'Invalid price configuration' }, { status: 400 });
        }

        const origin = req.headers.get('origin');

        // Create a checkout session on Stripe
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/cancel`,
            metadata: {
                userId: userId,
                tier: tier
            },
            customer_email: email
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
