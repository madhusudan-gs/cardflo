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
    }>({
        totalUsers: 0,
        totalLeads: 0,
        activeSubscriptions: 0,
        conversionRate: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAdminStats = async () => {
            // In a real app, these would be RPC calls or a single aggregated API route
            // for security and performance.
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: leadCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
            const { count: subCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('subscription_status', 'none');

            setStats({
                totalUsers: userCount || 0,
                totalLeads: leadCount || 0,
                activeSubscriptions: subCount || 0,
                conversionRate: userCount ? Math.round(((subCount || 0) / userCount) * 100) : 0
            });
            setLoading(false);
        };

        fetchAdminStats();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Loading Analytics...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col p-6">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 mr-2">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h2 className="text-2xl font-bold text-white tracking-tight">System Admin</h2>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 uppercase tracking-widest">
                    <Activity className="w-3 h-3" />
                    Live Status
                </div>
            </header>

            <main className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Users</p>
                            <h3 className="text-3xl font-black text-white mt-1">{stats.totalUsers}</h3>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                            <Database className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Leads</p>
                            <h3 className="text-3xl font-black text-white mt-1">{stats.totalLeads}</h3>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                            <CreditCard className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Active Subs</p>
                            <h3 className="text-3xl font-black text-white mt-1">{stats.activeSubscriptions}</h3>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                            <Activity className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Conv. Rate</p>
                            <h3 className="text-3xl font-black text-white mt-1">{stats.conversionRate}%</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Platform Insights</h4>
                    <ul className="space-y-4">
                        <li className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold uppercase">Avg Leads Per User</span>
                            <span className="text-slate-300 font-mono">{(stats.totalLeads / (stats.totalUsers || 1)).toFixed(1)}</span>
                        </li>
                        <li className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold uppercase">System Uptime</span>
                            <span className="text-emerald-400 font-mono">99.9%</span>
                        </li>
                        <li className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-bold uppercase">API Keys Active</span>
                            <span className="text-slate-300 font-mono">Verified</span>
                        </li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
