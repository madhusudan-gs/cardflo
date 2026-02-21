import { NextResponse } from 'next/server';
import { sendPostVerificationEmail } from '@/lib/email-service';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { email, name } = body;

        // Force the email to match the session for security to prevent spoofing
        const targetEmail = session.user.email;

        if (!targetEmail) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const result = await sendPostVerificationEmail(targetEmail, name || 'there');

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result.data });

    } catch (error: any) {
        console.error('API Route Error /email/post-verify:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
