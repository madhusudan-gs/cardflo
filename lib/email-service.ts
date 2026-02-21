import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123');

export async function sendWelcomeEmail(toEmail: string, userName: string) {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'YOUR_RESEND_API_KEY_HERE') {
        console.warn('RESEND_API_KEY is not configured. Skipping welcome email.');
        return { success: false, error: 'Resend API key missing' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Cardflo <hello@cardflo.io>', // Update this when you verify your domain
            to: [toEmail],
            subject: 'Welcome to Cardflo! 🎉',
            html: `
                <div style="font-family: sans-serif; p-color: #333;">
                    <h2>Hi ${userName || 'there'}, welcome to Cardflo!</h2>
                    <p>We're thrilled to have you on board. Cardflo is designed to make managing your professional network effortless.</p>
                    <p>Here are a few things you can do to get started:</p>
                    <ul>
                        <li><strong>Scan a card:</strong> Try taking a picture of a business card.</li>
                        <li><strong>Review your leads:</strong> Head over to "My Cards" to see your digital rolodex.</li>
                    </ul>
                    <p>If you have any questions or feedback, just reply to this email!</p>
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
        console.error('Failed to send welcome email:', err);
        return { success: false, error: err.message };
    }
}
