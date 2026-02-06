import Razorpay from 'razorpay';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('Razorpay API keys are missing. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment variables.');
}

export const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder',
});
