export const PAYMENT_CONFIG = {
    razorpay: {
        plans: {
            lite: process.env.RAZORPAY_PLAN_LITE || 'plan_placeholder_id',
            standard: process.env.RAZORPAY_PLAN_STANDARD || 'plan_placeholder_id',
            pro: process.env.RAZORPAY_PLAN_PRO || 'plan_placeholder_id',
            team: process.env.RAZORPAY_PLAN_TEAM || 'plan_placeholder_id',
        }
    },
    stripe: {
        prices: {
            lite: process.env.STRIPE_PRICE_LITE || 'price_placeholder_id',
            standard: process.env.STRIPE_PRICE_STANDARD || 'price_placeholder_id',
            pro: process.env.STRIPE_PRICE_PRO || 'price_placeholder_id',
            team: process.env.STRIPE_PRICE_TEAM || 'price_placeholder_id',
        }
    }
};
