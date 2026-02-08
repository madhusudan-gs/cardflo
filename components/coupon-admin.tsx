"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui/shared";
import { ChevronLeft, Ticket, Plus, Loader2, Trash2 } from "lucide-react";

export function CouponAdmin({ onBack }: { onBack: () => void }) {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const [newCode, setNewCode] = useState("");
    const [bonusScans, setBonusScans] = useState(50);
    const [maxUses, setMaxUses] = useState(1);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setCoupons(data);
        setLoading(false);
    };

    const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "";
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewCode(result);
    };

    const saveCoupon = async () => {
        if (!newCode) return;
        setGenerating(true);
        const { error } = await (supabase.from('coupons') as any).insert({
            code: newCode,
            bonus_scans: bonusScans,
            max_uses: maxUses
        });

        if (error) {
            alert(`Error. ${error.message}`);
        } else {
            setNewCode("");
            fetchCoupons();
        }
        setGenerating(false);
    };

    const deleteCoupon = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        await supabase.from('coupons').delete().eq('id', id);
        fetchCoupons();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
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
                        <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase italic">Coupon Admin</h2>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Growth & Incentives</p>
                    </div>
                </div>
            </header>

            <main className="space-y-8">
                <div className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-6 shadow-2xl space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Generate New Code</h3>

                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                value={newCode}
                                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                placeholder="8-Digit Code"
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500/50"
                            />
                            <Button variant="ghost" className="border border-slate-800 rounded-xl" onClick={generateCode}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[8px] font-black uppercase text-slate-500 mb-1 block">Bonus Scans</label>
                                <input
                                    type="number"
                                    value={bonusScans}
                                    onChange={(e) => setBonusScans(parseInt(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-black uppercase text-slate-500 mb-1 block">Max Uses</label>
                                <input
                                    type="number"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(parseInt(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white"
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl h-12 uppercase tracking-widest"
                            onClick={saveCoupon}
                            disabled={!newCode || generating}
                        >
                            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Discount'}
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Coupons</h3>
                    {coupons.map(coupon => (
                        <div key={coupon.id} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Ticket className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-mono font-bold text-white tracking-widest uppercase">{coupon.code}</p>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">+{coupon.bonus_scans} Scans • {coupon.current_uses}/{coupon.max_uses} used</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-600 hover:text-red-400"
                                onClick={() => deleteCoupon(coupon.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    {coupons.length === 0 && (
                        <p className="text-center text-[10px] text-slate-600 uppercase font-black tracking-widest py-8 italic">No active coupons</p>
                    )}
                </div>
            </main>
        </div>
    );
}
