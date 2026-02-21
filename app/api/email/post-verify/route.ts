import { NextResponse } from 'next/server';
import { sendPostVerificationEmail } from '@/lib/email-service';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, name } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const result = await sendPostVerificationEmail(email, name || 'there');

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result.data });

    } catch (error: any) {
        console.error('API Route Error /email/post-verify:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
