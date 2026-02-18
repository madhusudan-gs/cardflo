"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "./ui/shared";
import { ChevronLeft, Users, Database, CreditCard, Activity, Loader2, Ticket, Plus, Trash2, ShieldAlert, Lock, Unlock } from "lucide-react";
import { toggleRegistrations, getGlobalSettings } from "@/lib/paywall-service";

export function AdminDashboard({ onBack, userRole = 'super_admin', teamId }: {
    onBack: () => void,
    userRole?: 'super_admin' | 'team_admin',
    teamId?: string | null
}) {
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
    const [view, setView] = useState<'stats' | 'users' | 'leads' | 'coupons'>('stats');

    // Coupon-specific state
    const [coupons, setCoupons] = useState<any[]>([]);
    const [generating, setGenerating] = useState(false);
    const [newCode, setNewCode] = useState("");
    const [bonusScans, setBonusScans] = useState(50);
    const [maxUses, setMaxUses] = useState(1);
    const [durationMonths, setDurationMonths] = useState(1);

    // Security State
    const [security, setSecurity] = useState({
        registrationsEnabled: true,
        dailyScanLimit: 5000,
        dailyScanCount: 0
    });
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        const fetchAdminStats = async () => {
            setLoading(true);
            try {
                // Use the new RPC function to bypass RLS issues
                const { data, error } = await supabase.rpc('get_admin_summary');

                if (error) {
                    console.error("Cardflo Debug: RPC Stats Error:", error);
                    // Fallback to manual check if RPC fails (e.g. not created yet)
                    return;
                }

                if (data) {
                    const statsData = data as any;
                    setStats({
                        totalUsers: statsData.totalUsers || 0,
                        totalLeads: statsData.totalLeads || 0,
                        activeSubscriptions: statsData.activeSubscriptions || 0,
                        conversionRate: statsData.totalUsers ? Math.round((statsData.activeSubscriptions / statsData.totalUsers) * 100) : 0,
                        planBreakdown: statsData.planBreakdown || {},
                        estimatedMRR: statsData.estimatedMRR || 0,
                        recentUsers: statsData.recentUsers || [],
                        recentLeads: statsData.recentLeads || []
                    });

                    // If super_admin, also fetch coupons (keep this separate for now)
                    if (userRole === 'super_admin') {
                        const { data: couponData } = await supabase
                            .from('coupons')
                            .select('*')
                            .order('created_at', { ascending: false });
                        if (couponData) setCoupons(couponData);
                    }
                }
            } catch (err) {
                console.error("Cardflo Debug: Fetch Stats Crash:", err);
            } finally {
                setLoading(false);
            }
        };

        const fetchSecuritySettings = async () => {
            if (userRole !== 'super_admin') return;
            const settings = await getGlobalSettings();
            if (settings) {
                setSecurity({
                    registrationsEnabled: settings.registrations_enabled,
                    dailyScanLimit: settings.daily_scan_limit,
                    dailyScanCount: settings.daily_scan_count
                });
            }
        };

        fetchAdminStats();
        fetchSecuritySettings();
    }, [userRole, teamId]);

    const handleToggleRegistrations = async () => {
        setToggling(true);
        const newState = !security.registrationsEnabled;
        const success = await toggleRegistrations(newState);
        if (success) {
            setSecurity(prev => ({ ...prev, registrationsEnabled: newState }));
        } else {
            alert("Failed to update registration settings");
        }
        setToggling(false);
    };

    const handleGenerateCoupon = async () => {
        if (!newCode) return;
        setGenerating(true);
        const { error } = await (supabase.from('coupons') as any).insert({
            code: newCode,
            bonus_scans: bonusScans,
            max_uses: maxUses,
            duration_months: durationMonths
        });

        if (!error) {
            setNewCode("");
            // Refresh coupons
            const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
            if (data) setCoupons(data);
        }
        setGenerating(false);
    };

    const handleDeleteCoupon = async (id: string) => {
        await supabase.from('coupons').delete().eq('id', id);
        setCoupons(coupons.filter(c => c.id !== id));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest text-[10px]">
                    {userRole === 'super_admin' ? 'Super Admin Pulse...' : 'Team Sync...'}
                </p>
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
                        <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase italic">
                            {userRole === 'super_admin' ? 'Super Admin' : 'Team Admin'}
                        </h2>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            {userRole === 'super_admin' ? 'Platform Analytics' : 'Organization Hub'}
                        </p>
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
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                        view === 'stats' ? "bg-white text-black border-white" : "text-slate-500 border-slate-800"
                    )}
                >Dashboard</button>
                <button
                    onClick={() => setView('users')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                        view === 'users' ? "bg-white text-black border-white" : "text-slate-500 border-slate-800"
                    )}
                >Users ({stats.totalUsers})</button>
                <button
                    onClick={() => setView('leads')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                        view === 'leads' ? "bg-white text-black border-white" : "text-slate-500 border-slate-800"
                    )}
                >All Leads</button>
                {userRole === 'super_admin' && (
                    <button
                        onClick={() => setView('coupons')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                            view === 'coupons' ? "bg-emerald-500 text-slate-950 border-emerald-500" : "text-slate-500 border-slate-800"
                        )}
                    >Coupons</button>
                )}
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
                                Upgrade Distribution
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

                        {/* Security Controls */}
                        {userRole === 'super_admin' && (
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <ShieldAlert className="w-24 h-24 text-red-500" />
                                </div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                                    <ShieldAlert className="w-3 h-3 text-red-500" />
                                    Security Protocols
                                </h4>

                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Scan Load</p>
                                            <div className="flex items-baseline gap-1 mt-1">
                                                <span className={`text-xl font-black ${security.dailyScanCount > 4000 ? 'text-red-500' : 'text-white'}`}>
                                                    {security.dailyScanCount}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-600">/ {security.dailyScanLimit}</span>
                                            </div>
                                        </div>
                                        <div className="h-10 w-1 bg-slate-800 rounded-full" />
                                        <div className="flex flex-col items-end">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">New Registrations</p>
                                            <button
                                                onClick={handleToggleRegistrations}
                                                disabled={toggling}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${security.registrationsEnabled
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                                                    : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                                                    }`}
                                            >
                                                {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                                                    security.registrationsEnabled ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />
                                                )}
                                                <span className="text-[9px] font-black uppercase tracking-widest">
                                                    {security.registrationsEnabled ? 'Allowed' : 'Locked'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {view === 'users' && (
                    <div className="space-y-3">
                        {(stats.recentUsers as any[]).map((u: any) => (
                            <div key={u.id} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-white truncate">{u.email}</p>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">Updated {new Date(u.updated_at).toLocaleDateString()}</p>
                                </div>
                                <div className={cn(
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
                        {(stats.recentLeads as any[]).map((l: any) => (
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

                {view === 'coupons' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                        {/* ... Generator form ... */}
                        <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Generate New Discount</h3>
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        value={newCode}
                                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                        placeholder="CODE88"
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                                    />
                                    <Button variant="ghost" className="border border-slate-800 rounded-xl" onClick={() => {
                                        const c = Math.random().toString(36).substring(2, 10).toUpperCase();
                                        setNewCode(c);
                                    }}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[8px] font-black uppercase text-slate-500 mb-1 block tracking-widest">Bonus Scans</label>
                                        <input type="number" value={bonusScans} onChange={(e) => setBonusScans(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" />
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black uppercase text-slate-500 mb-1 block tracking-widest">Uses</label>
                                        <input type="number" value={maxUses} onChange={(e) => setMaxUses(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[8px] font-black uppercase text-slate-500 mb-1 block tracking-widest">Duration (Months)</label>
                                    <input type="number" value={durationMonths} onChange={(e) => setDurationMonths(parseInt(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" min="1" />
                                    <p className="text-[8px] text-slate-500 mt-1">Users get <strong className="text-emerald-400">{durationMonths + 1} months</strong> to use these scans.</p>
                                </div>
                                <Button className="w-full bg-emerald-500 text-slate-950 font-black rounded-xl h-12 uppercase tracking-widest text-[10px]" onClick={handleGenerateCoupon} disabled={!newCode || generating}>
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Discount'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Active Coupons</h3>
                            {coupons.map((c: any) => (
                                <div key={c.id} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                                            <Ticket className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono font-bold text-white tracking-widest uppercase">{c.code}</p>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">+{c.bonus_scans} Scans • {c.current_uses}/{c.max_uses} used • {c.duration_months || 1}mo</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-slate-600 hover:text-red-400" onClick={() => handleDeleteCoupon(c.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
