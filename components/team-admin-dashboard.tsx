"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "./ui/shared";
import { ChevronLeft, Users, Activity, Loader2, Trash2, UserPlus, Mail, CheckCircle, AlertCircle } from "lucide-react";

interface TeamMember {
    user_id: string;
    role: string;
    email: string;
    full_name: string;
    scans_count: number;
    cycle_end: string | null;
}

export function TeamAdminDashboard({ onBack, teamId }: {
    onBack: () => void;
    teamId: string;
}) {
    const [view, setView] = useState<'users' | 'usage'>('users');
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [inviteMessage, setInviteMessage] = useState("");
    const [removingId, setRemovingId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchMembers = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        try {
            const res = await fetch(`/api/team/members?teamId=${teamId}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (data.members) setMembers(data.members);
        } catch (e) {
            console.error("Failed to fetch team members", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMembers(); }, [teamId]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        setInviteStatus('idle');

        const { data: { session } } = await supabase.auth.getSession();
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', session?.user.id || '')
            .single();

        try {
            const res = await fetch('/api/team/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    email: inviteEmail.trim(),
                    teamId,
                    inviterName: (profile as any)?.full_name || session?.user.email
                })
            });
            const data = await res.json();
            if (res.ok) {
                setInviteStatus('success');
                setInviteMessage(data.message || 'Invite sent!');
                setInviteEmail("");
                fetchMembers(); // refresh list
            } else {
                setInviteStatus('error');
                setInviteMessage(data.error || 'Failed to send invite');
            }
        } catch (e: any) {
            setInviteStatus('error');
            setInviteMessage(e.message || 'Network error');
        } finally {
            setInviting(false);
            setTimeout(() => setInviteStatus('idle'), 4000);
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Remove this member from the team?")) return;
        setRemovingId(userId);
        const { data: { session } } = await supabase.auth.getSession();
        try {
            await fetch('/api/team/members', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ teamId, userId })
            });
            setMembers(prev => prev.filter(m => m.user_id !== userId));
        } finally {
            setRemovingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Team Sync...</p>
            </div>
        );
    }

    const SCAN_LIMIT = 1000; // team plan limit

    return (
        <div className="min-h-[100dvh] bg-slate-950 text-slate-200 flex flex-col p-6 max-w-lg mx-auto pb-24">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 mr-2 h-8 w-8">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase italic">Team Admin</h2>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Organization Hub</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {members.length} Member{members.length !== 1 ? 's' : ''}
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                <button
                    onClick={() => setView('users')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        view === 'users' ? "bg-white text-black border-white" : "text-slate-500 border-slate-800"
                    )}
                >
                    <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Members</span>
                </button>
                <button
                    onClick={() => setView('usage')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        view === 'usage' ? "bg-emerald-500 text-slate-950 border-emerald-500" : "text-slate-500 border-slate-800"
                    )}
                >
                    <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> Usage</span>
                </button>
            </div>

            {/* Members Tab */}
            {view === 'users' && (
                <div className="space-y-6">
                    {/* Invite Form */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-emerald-400" /> Add Member
                        </h3>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                placeholder="Enter member email..."
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                            <Button
                                onClick={handleInvite}
                                disabled={inviting || !inviteEmail.trim()}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 rounded-xl"
                            >
                                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
                            </Button>
                        </div>
                        {inviteStatus !== 'idle' && (
                            <div className={cn(
                                "mt-3 flex items-center gap-2 text-xs font-bold",
                                inviteStatus === 'success' ? 'text-emerald-400' : 'text-red-400'
                            )}>
                                {inviteStatus === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {inviteMessage}
                            </div>
                        )}
                    </div>

                    {/* Member List */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Members</h3>
                        {members.length === 0 ? (
                            <p className="text-slate-600 text-sm text-center py-8">No members yet. Add someone above!</p>
                        ) : members.map(member => (
                            <div key={member.user_id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-black text-slate-300">
                                        {(member.full_name || member.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{member.full_name || 'No name'}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Mail className="w-3 h-3" />{member.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border",
                                        member.role === 'owner'
                                            ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                                            : "text-slate-400 border-slate-700 bg-slate-800"
                                    )}>
                                        {member.role}
                                    </span>
                                    {member.role !== 'owner' && (
                                        <button
                                            onClick={() => handleRemove(member.user_id)}
                                            disabled={removingId === member.user_id}
                                            className="text-slate-600 hover:text-red-400 transition-colors"
                                        >
                                            {removingId === member.user_id
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Usage Tab */}
            {view === 'usage' && (
                <div className="space-y-6">
                    {/* Team Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-white">
                                {members.reduce((sum, m) => sum + m.scans_count, 0)}
                            </div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Total Scans</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-white">{members.length}</div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Members</div>
                        </div>
                    </div>

                    {/* Per-Member Usage */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Per Member Usage</h3>
                        {members.map(member => {
                            const pct = Math.min(100, Math.round((member.scans_count / SCAN_LIMIT) * 100));
                            return (
                                <div key={member.user_id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <p className="text-sm font-bold text-white">{member.full_name || member.email}</p>
                                            <p className="text-[10px] text-slate-500">{member.email}</p>
                                        </div>
                                        <span className="text-sm font-black text-white">{member.scans_count}<span className="text-slate-600 text-xs font-normal">/{SCAN_LIMIT}</span></span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                pct >= 80 ? "bg-amber-400" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    {member.cycle_end && (
                                        <p className="text-[9px] text-slate-600 mt-1.5">Cycle ends {new Date(member.cycle_end).toLocaleDateString()}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
