
import { useState, useEffect } from 'react';
import { Button } from './ui/shared';
import { Zap, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { SubscriptionTier, PLAN_CONFIGS, redeemCoupon } from '@/lib/paywall-service';

interface PaywallUIProps {
    currentTier: SubscriptionTier;
    usageCount: number;
    bonusScans: number;
    userId: string;
    email: string;
    onClose?: () => void;
    onRedeemSuccess?: () => void;
}

export function PaywallUI({ currentTier, usageCount, bonusScans, userId, email, onClose, onRedeemSuccess }: PaywallUIProps) {
    const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
    const [loading, setLoading] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState("");
    const [couponLoading, setCouponLoading] = useState(false);

    const config = PLAN_CONFIGS[currentTier];
    const totalLimit = config.scanLimit + bonusScans;
    const usagePercent = Math.min(100, (usageCount / totalLimit) * 100);
    const isAtLimit = usageCount >= totalLimit;

    const plans = [
        {
            id: 'starter',
            name: 'Starter',
            scans: 10,
            prices: { USD: 'Free', INR: 'Free' },
            features: ['10 Scans/mo', 'No Export', 'Basic Queue'],
            export: false
        },
        {
            id: 'lite',
            name: 'Lite',
            scans: 40,
            prices: { USD: '$5', INR: '₹399' },
            features: ['40 Scans/mo', 'Export Enabled', 'Email Support'],
            export: true
        },
        {
            id: 'standard',
            name: 'Standard',
            scans: 150,
            prices: { USD: '$11', INR: '₹899' },
            features: ['150 Scans/mo', 'Export Enabled', 'Priority AI Extraction'],
            export: true
        },
        {
            id: 'pro',
            name: 'Pro',
            scans: 600,
            prices: { USD: '$22', INR: '₹1799' },
            features: ['600 Scans/mo', 'Unlimited Exports', 'Dedicated Support'],
            export: true
        },
        {
            id: 'team',
            name: 'Teams',
            scans: 1000,
            prices: { USD: '$55', INR: '₹4499' },
            features: ['1000 Shared Scans/mo', 'Up to 5 Members', 'Unlimited Exports', 'Dedicated Support'],
            export: true
        },
    ];

    const handleUpgrade = async (tier: SubscriptionTier) => {
        setLoading(tier);
        try {
            if (currency === 'USD') {
                const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tier, userId, email }),
                });
                const { url, error } = await res.json();
                if (error) throw new Error(error);
                window.location.href = url;
            } else {
                // Razorpay Checkout via Supabase Edge Function
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                const res = await fetch(`${supabaseUrl}/functions/v1/razorpay-checkout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                    },
                    body: JSON.stringify({ tier, userId, email }),
                });
                const { subscriptionId, key, error } = await res.json();
                if (error) throw new Error(error);

                const options = {
                    key: key,
                    subscription_id: subscriptionId,
                    name: 'Cardflo',
                    description: `${tier.toUpperCase()} Subscription`,
                    handler: function (response: any) {
                        alert('Payment successful! Your upgrade will be active shortly.');
                        if (onClose) onClose();
                    },
                    prefill: {
                        email: email
                    },
                    theme: {
                        color: '#10b981'
                    }
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
            }
        } catch (err: any) {
            console.error('Payment upgrade error:', err);
            alert(`Upgrade failed: ${err.message || 'Please try again.'}`);
        } finally {
            setLoading(null);
        }
    };

    const handleRedeem = async () => {
        if (!couponCode) return;
        setCouponLoading(true);
        try {
            const result = await (redeemCoupon as any)(userId, couponCode);
            if (result.success) {
                alert(`Success! You've received ${result.bonus_scans} bonus scans.`);
                setCouponCode("");
                if (onRedeemSuccess) onRedeemSuccess();
            } else {
                alert(result.message);
            }
        } catch (err) {
            alert("Failed to redeem coupon.");
        } finally {
            setCouponLoading(false);
        }
    };

    // Load Razorpay Script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onerror = () => console.error('Failed to load Razorpay SDK script.');
        document.body.appendChild(script);
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-3 pb-20 overflow-y-auto scrollbar-hide">
            <div className="max-w-5xl mx-auto space-y-2">
                {/* Usage Panel */}
                <div className="glass-panel p-3 rounded-xl border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 blur-[50px] rounded-full" />
                    <div className="flex justify-between items-center mb-1.5">
                        <div>
                            <p className="text-lg font-black">{usageCount} / {totalLimit} <span className="text-[9px] text-slate-500 uppercase">scans used</span></p>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active: {currentTier}</span>
                        </div>
                    </div>

                    <div className="h-2.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${isAtLimit ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-emerald-600 to-cyan-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>

                    {isAtLimit && (
                        <div className="mt-2 flex items-center gap-2 text-red-400 animate-pulse">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Monthly limit reached. Upgrade to continue syncing.</span>
                        </div>
                    )}
                </div>

                {/* Currency Selector */}
                <div className="flex justify-center">
                    <div className="bg-slate-900 p-0.5 rounded-lg flex border border-slate-800">
                        <button
                            onClick={() => setCurrency('INR')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${currency === 'INR' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            INR
                        </button>
                        <button
                            onClick={() => setCurrency('USD')}
                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${currency === 'USD' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            USD
                        </button>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`glass-panel p-2.5 rounded-xl border transition-all duration-300 relative flex flex-col ${plan.id === currentTier ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/5 scale-[1.02] z-10' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'}`}
                        >
                            {plan.id === currentTier && (
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full text-white shadow-lg">
                                    Current Tier
                                </div>
                            )}

                            <div className="mb-2">
                                <h3 className="text-xs font-black tracking-tight">{plan.name}</h3>
                                <div className="flex items-baseline gap-0.5 mt-0.5">
                                    <span className="text-base font-black">{(plan.prices as any)[currency]}</span>
                                    <span className="text-[7px] text-slate-500 uppercase font-bold">/ mo</span>
                                </div>
                            </div>

                            <div className="space-y-1 flex-1">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-1.5">
                                        <Check className="w-3 h-3 text-emerald-500 mt-0.5" />
                                        <span className="text-[10px] text-slate-300 font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={() => handleUpgrade(plan.id as SubscriptionTier)}
                                disabled={plan.id === currentTier || !!loading}
                                className={`w-full mt-2 h-7 rounded-lg font-black uppercase text-[8px] tracking-[0.1em] transition-all ${plan.id === currentTier ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-950 hover:bg-emerald-400 hover:text-white shadow-xl'}`}
                            >
                                {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : plan.id === currentTier ? 'Active' : 'Get Started'}
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Sustainability Note */}
                <p className="text-center text-[10px] text-slate-500 leading-snug max-w-md mx-auto">Cardflo is self-sustaining. Plans are priced to cover infrastructure and AI costs while keeping the product accessible.</p>

                {/* Coupon Section */}
                <div className="glass-panel p-8 rounded-[2rem] border-slate-800 bg-slate-900/30">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 text-center md:text-left">
                            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400">Have a coupon?</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Enter your code below for bonus scans.</p>
                        </div>
                        <div className="flex w-full md:w-auto gap-2">
                            <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="ENTER CODE"
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest focus:border-emerald-500 transition-all outline-none w-full md:w-48"
                            />
                            <Button
                                onClick={handleRedeem}
                                disabled={!couponCode || couponLoading}
                                className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 min-w-[100px]"
                            >
                                {couponLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Redeem'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest">
                        Continue with basic version
                    </Button>
                </div>
            </div>
        </div>
    );
}

