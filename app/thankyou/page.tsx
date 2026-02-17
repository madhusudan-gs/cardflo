'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shared';
import { Gift, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { redeemCoupon } from '@/lib/paywall-service';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ThankYouPage() {
    const [couponCode, setCouponCode] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [redeemed, setRedeemed] = useState(false);
    const [bonusScans, setBonusScans] = useState(0);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUser();
    }, []);

    const handleRedeem = async () => {
        if (!couponCode || !userId) return;
        setCouponLoading(true);
        try {
            const result = await (redeemCoupon as any)(userId, couponCode);
            if (result.success) {
                setBonusScans(result.bonus_scans);
                setRedeemed(true);
                setCouponCode('');
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert('Failed to redeem coupon.');
        } finally {
            setCouponLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full space-y-8 text-center">
                {/* Header */}
                <div className="space-y-3">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                        <Gift className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">Thank You!</h1>
                    <p className="text-sm text-slate-400">Have a coupon code? Redeem it below for bonus scans.</p>
                </div>

                {/* Coupon Redemption */}
                {redeemed ? (
                    <div className="glass-panel p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                        <h2 className="text-lg font-black text-emerald-400">Coupon Redeemed!</h2>
                        <p className="text-sm text-slate-300">You&apos;ve received <span className="font-black text-white">{bonusScans} bonus scans</span>.</p>
                    </div>
                ) : (
                    <div className="glass-panel p-8 rounded-2xl border border-slate-800 bg-slate-900/30 space-y-4">
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="ENTER COUPON CODE"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest text-center focus:border-emerald-500 transition-all outline-none"
                        />
                        <Button
                            onClick={handleRedeem}
                            disabled={!couponCode || couponLoading || !userId}
                            className="w-full bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 h-10"
                        >
                            {couponLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Redeem Coupon'}
                        </Button>
                    </div>
                )}

                {/* Back to Home */}
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
