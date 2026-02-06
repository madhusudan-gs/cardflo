import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Stripe secret key is missing. Please add STRIPE_SECRET_KEY to your environment variables.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'placeholder', {
    apiVersion: '2023-10-16' as any, // Use an appropriate version
});
