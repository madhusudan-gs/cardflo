import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
    try {
        const { email, teamId, inviterName } = await req.json();

        if (!email || !teamId) {
            return NextResponse.json({ error: 'Missing email or teamId' }, { status: 400 });
        }

        // Verify the caller is an owner/admin of this team (security check)
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: membership } = await supabaseAdmin
            .from('team_members')
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', user.id)
            .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json({ error: 'Not authorized to invite to this team' }, { status: 403 });
        }

        // Check if a user with this email already exists
        const { data: existingProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('email', email);

        const existingUser = existingProfiles?.[0];

        if (existingUser) {
            // User already exists — add them to the team directly
            const { error: memberError } = await supabaseAdmin
                .from('team_members')
                .upsert({ team_id: teamId, user_id: existingUser.id, role: 'member' }, { onConflict: 'team_id,user_id' });

            if (!memberError) {
                await supabaseAdmin
                    .from('profiles')
                    .update({ team_id: teamId })
                    .eq('id', existingUser.id);
            }
        }

        // Send invite email regardless (existing users get a "you've been added", new users get a sign-up link)
        const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cardflo.in'}?invite_team=${teamId}&invite_email=${encodeURIComponent(email)}`;

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: 'Cardflo Team <support@cardflo.in>',
            to: email,
            subject: `${inviterName || 'Your team admin'} invited you to Cardflo`,
            html: `
                <div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #0f172a; color: #e2e8f0; border-radius: 16px;">
                    <img src="https://cardflo.in/logo.png" alt="Cardflo" style="height: 48px; margin-bottom: 24px;" />
                    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 12px;">You're invited to a Cardflo Team!</h2>
                    <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
                        <strong style="color: #f1f5f9;">${inviterName || 'A team admin'}</strong> has invited you to collaborate on Cardflo — the fastest way to scan and organize business cards with AI.
                    </p>
                    <a href="${signupUrl}" style="display:inline-block; margin: 24px 0; padding: 14px 28px; background: #10b981; color: #0f172a; border-radius: 12px; font-weight: 900; font-size: 14px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.1em;">
                        Accept Invite & Sign Up →
                    </a>
                    <p style="color: #475569; font-size: 12px;">If you already have a Cardflo account, sign in with this email address and you'll be automatically added to the team.</p>
                </div>
            `
        });

        return NextResponse.json({ success: true, message: existingUser ? 'Member added and notified.' : 'Invite email sent.' });
    } catch (error: any) {
        console.error('[TEAM INVITE ERROR]', error);
        return NextResponse.json({ error: error.message || 'Failed to send invite' }, { status: 500 });
    }
}
