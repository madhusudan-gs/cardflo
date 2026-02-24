import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch team members with their profiles and usage
    const { data: members, error } = await supabaseAdmin
        .from('team_members')
        .select(`
            role,
            user_id,
            profiles:user_id (
                id,
                email,
                full_name,
                subscription_tier
            )
        `)
        .eq('team_id', teamId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // For each member, fetch usage
    const membersWithUsage = await Promise.all((members || []).map(async (m: any) => {
        const { data: usage } = await supabaseAdmin
            .from('usage')
            .select('scans_count, cycle_end')
            .eq('user_id', m.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        return {
            user_id: m.user_id,
            role: m.role,
            email: m.profiles?.email,
            full_name: m.profiles?.full_name,
            scans_count: usage?.scans_count || 0,
            cycle_end: usage?.cycle_end,
        };
    }));

    return NextResponse.json({ members: membersWithUsage });
}

export async function DELETE(req: Request) {
    try {
        const { teamId, userId } = await req.json();
        if (!teamId || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Only owner can remove members
        const { data: membership } = await supabaseAdmin
            .from('team_members')
            .select('role')
            .eq('team_id', teamId)
            .eq('user_id', user.id)
            .single();

        if (!membership || membership.role !== 'owner') {
            return NextResponse.json({ error: 'Only the team owner can remove members' }, { status: 403 });
        }

        // Remove from team_members
        await supabaseAdmin.from('team_members').delete()
            .eq('team_id', teamId).eq('user_id', userId);

        // Remove team_id from their profile
        await supabaseAdmin.from('profiles').update({ team_id: null }).eq('id', userId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
