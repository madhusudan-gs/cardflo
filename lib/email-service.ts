import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123');

export async function sendPostVerificationEmail(toEmail: string, userName: string) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'YOUR_RESEND_API_KEY_HERE') {
        console.warn('RESEND_API_KEY is not configured. Skipping post-verification email.');
        return { success: false, error: 'Resend API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Cardflo <hello@cardflo.io>', // Update this when you verify your domain
            to: [toEmail],
            subject: 'Thank you for verifying your email! 🎉',
            html: `
                <div style="font-family: sans-serif; p-color: #333; line-height: 1.6;">
                    <h2>Hi ${userName || 'there'}, your account is fully verified!</h2>
                    <p>Thank you for confirming your email. You are now ready to capture leads seamlessly via Cardflo.</p>
                    
                    <h3 style="margin-top: 24px;">Quick look at our Pricing & Terms</h3>
                    <p>We believe in simple, transparent pricing for all professionals:</p>
                    <ul style="margin-bottom: 24px;">
                        <li><strong>Starter:</strong> 10 free scans per month (Free forever)</li>
                        <li><strong>Standard:</strong> Unlimited scanning, export to CSV ($9.99/mo)</li>
                        <li><strong>Pro:</strong> Unlimited scanning, Team collaboration, API access ($19.99/mo)</li>
                    </ul>

                    <h3 style="margin-top: 24px;">Earn Free Scans! 🎁</h3>
                    <p>When you invite a colleague using your unique referral code (found on the dashboard), you both will receive <strong>10 bonus scans</strong> immediately upon their signup!</p>
                    
                    <p>If you have any questions, just reply to this email!</p>
                    <br/>
                    <p>Best,</p>
                    <p>The Cardflo Team</p>
                </div>
            `,
        });

        if (error) {
            console.error('Resend Error:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error('Failed to send post-verification email:', err);
        return { success: false, error: err.message };
    }
}
