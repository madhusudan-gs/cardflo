"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui/shared";
import { ChevronLeft, Users, Database, CreditCard, Activity, Loader2 } from "lucide-react";

export function AdminDashboard({ onBack }: { onBack: () => void }) {
    const [stats, setStats] = useState<{
        totalUsers: number;
        totalLeads: number;
        activeSubscriptions: number;
        conversionRate: number;
        planBreakdown: Record<string, number>;
        estimatedMRR: number;
        recentUsers: any[];
        recentLeads: any[];
    }>({
        totalUsers: 0,
        totalLeads: 0,
        activeSubscriptions: 0,
        conversionRate: 0,
        planBreakdown: {},
        estimatedMRR: 0,
        recentUsers: [],
        recentLeads: []
    });
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'stats' | 'users' | 'leads'>('stats');

    useEffect(() => {
        const fetchAdminStats = async () => {
            // 1. Fetch Profiles for Aggregation
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('id, email, subscription_tier, subscription_status, created_at')
                .order('created_at', { ascending: false });

            // 2. Fetch Total Leads Count & Recent Leads
            const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            const { data: recentLeads } = await supabase
                .from('leads')
                .select('id, first_name, last_name, company, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            if (profiles) {
                const breakdown: Record<string, number> = {
                    starter: 0, lite: 0, standard: 0, pro: 0, team: 0
                };
                let activeCount = 0;
                let mrr = 0;

                const pricing: Record<string, number> = {
                    starter: 0, lite: 9, standard: 19, pro: 49, team: 99
                };

                (profiles as any[]).forEach(p => {
                    const tier = p.subscription_tier || 'starter';
                    breakdown[tier] = (breakdown[tier] || 0) + 1;
                    if (p.subscription_status === 'active') {
                        activeCount++;
                        mrr += pricing[tier] || 0;
                    }
                });

                setStats({
                    totalUsers: profiles.length,
                    totalLeads: leadCount || 0,
                    activeSubscriptions: activeCount,
                    conversionRate: profiles.length ? Math.round((activeCount / profiles.length) * 100) : 0,
                    planBreakdown: breakdown,
                    estimatedMRR: mrr,
                    recentUsers: profiles.slice(0, 10),
                    recentLeads: recentLeads || []
                });
            }
            setLoading(false);
        };

        fetchAdminStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest text-[10px]">Super Admin Pulse...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col p-6 max-w-lg mx-auto pb-24">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 mr-2 h-8 w-8">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase italic">Super Admin</h2>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Platform Analytics</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Live Data
                </div>
            </header>

            <div className="flex gap-2 mb-6 scrollbar-hide overflow-x-auto pb-2">
                <button
                    onClick={() => setView('stats')}
                    className={clsx(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                        view === 'stats' ? "bg-white text-black border-white" : "text-slate-500 border-slate-800"
                    )}
                >Dashboard</button>
                <button
                    onClick={() => setView('users')}
                    className={clsx(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                        view === 'users' ? "bg-white text-black border-white" : "text-slate-500 border-slate-800"
                    )}
                >Users ({stats.totalUsers})</button>
                <button
                    onClick={() => setView('leads')}
                    className={clsx(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                        view === 'leads' ? "bg-white text-black border-white" : "text-slate-500 border-slate-800"
                    )}
                >All Leads</button>
            </div>

            <main className="space-y-6">
                {view === 'stats' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass-panel p-5 rounded-3xl border border-slate-800/50 space-y-4 shadow-2xl">
                                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                                    <Users className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Total Enrollment</p>
                                    <h3 className="text-2xl font-black text-white mt-0.5">{stats.totalUsers}</h3>
                                </div>
                            </div>

                            <div className="glass-panel p-5 rounded-3xl border border-slate-800/50 space-y-4 shadow-2xl">
                                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                                    <CreditCard className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Est. MRR</p>
                                    <h3 className="text-2xl font-black text-white mt-0.5">${stats.estimatedMRR}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Database className="w-3 h-3 text-slate-500" />
                                Plan Distribution
                            </h4>
                            <div className="space-y-5">
                                {Object.entries(stats.planBreakdown).map(([plan, count]) => (
                                    <div key={plan} className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-black uppercase">
                                            <span className="text-slate-400 tracking-widest">{plan}</span>
                                            <span className="text-white">{count}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 transition-all duration-1000"
                                                style={{ width: `${(count / (stats.totalUsers || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-6">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Financial Pulse</h4>
                            <ul className="space-y-3">
                                <li className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-500 font-black uppercase tracking-widest">Paid Conversion</span>
                                    <span className="text-emerald-400 font-mono font-bold">{stats.conversionRate}%</span>
                                </li>
                                <li className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-500 font-black uppercase tracking-widest">Average ARPU</span>
                                    <span className="text-white font-mono font-bold">${(stats.estimatedMRR / (stats.activeSubscriptions || 1)).toFixed(2)}</span>
                                </li>
                            </ul>
                        </div>
                    </>
                )}

                {view === 'users' && (
                    <div className="space-y-3">
                        {stats.recentUsers.map(u => (
                            <div key={u.id} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-white truncate">{u.email}</p>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className={clsx(
                                    "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest",
                                    u.subscription_status === 'active' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-500"
                                )}>
                                    {u.subscription_tier}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {view === 'leads' && (
                    <div className="space-y-3">
                        {stats.recentLeads.map(l => (
                            <div key={l.id} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] font-bold text-white">{l.first_name} {l.last_name}</p>
                                    <p className="text-[8px] text-slate-500 font-mono italic">{new Date(l.created_at).toLocaleDateString()}</p>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">{l.company || 'Private Lead'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
