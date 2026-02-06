export const PAYMENT_CONFIG = {
    razorpay: {
        plans: {
            lite: process.env.RAZORPAY_PLAN_LITE || 'plan_lite_id',
            standard: process.env.RAZORPAY_PLAN_STANDARD || 'plan_standard_id',
            pro: process.env.RAZORPAY_PLAN_PRO || 'plan_pro_id',
            team: process.env.RAZORPAY_PLAN_TEAM || 'plan_team_id',
        }
    },
    stripe: {
        prices: {
            lite: process.env.STRIPE_PRICE_LITE || 'price_lite_id',
            standard: process.env.STRIPE_PRICE_STANDARD || 'price_standard_id',
            pro: process.env.STRIPE_PRICE_PRO || 'price_pro_id',
            team: process.env.STRIPE_PRICE_TEAM || 'price_team_id',
        }
    }
};
