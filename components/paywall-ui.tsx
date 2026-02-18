
import { useState, useEffect } from 'react';
import { Button } from './ui/shared';
import { Zap, Check, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import { SubscriptionTier, PLAN_CONFIGS } from '@/lib/paywall-service';

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
        <div className="h-screen bg-slate-950 text-white p-4 overflow-hidden flex flex-col items-center justify-center">
            <div className="max-w-6xl mx-auto w-full space-y-4">

                {/* Header Section: Usage + Currency */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Compact Usage Panel */}
                    <div className="col-span-2 glass-panel p-3 rounded-xl border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden flex items-center justify-between gap-4">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[60px] rounded-full" />

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1.5">
                                <h2 className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Scan Usage</h2>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{currentTier} Tier</span>
                            </div>
                            <div className="h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-[1px]">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${isAtLimit ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-600 to-cyan-500'}`}
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1">
                                <p className="text-xs font-black text-white">{usageCount} / {totalLimit}</p>
                                {isAtLimit && <span className="text-[8px] font-bold text-red-400 uppercase tracking-wider animate-pulse">Limit Reached</span>}
                            </div>
                        </div>
                    </div>

                    {/* Currency Selector */}
                    <div className="flex justify-end">
                        <div className="bg-slate-900 p-0.5 rounded-lg flex border border-slate-800 inline-flex">
                            <button
                                onClick={() => setCurrency('INR')}
                                className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${currency === 'INR' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                INR
                            </button>
                            <button
                                disabled
                                className="px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest text-slate-600 cursor-not-allowed"
                            >
                                USD
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-5 gap-2 h-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`glass-panel p-3 rounded-xl border transition-all duration-300 relative flex flex-col ${plan.id === currentTier ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50 z-10' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'}`}
                        >
                            {plan.id === currentTier && (
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-[7px] font-black uppercase px-2 py-0.5 rounded-full text-white shadow-sm whitespace-nowrap">
                                    Current Plan
                                </div>
                            )}

                            <div className="mb-3 text-center">
                                <h3 className="text-xs font-black tracking-tight text-slate-300 uppercase">{plan.name}</h3>
                                <div className="flex items-baseline justify-center gap-0.5 mt-1 border-b border-slate-800/50 pb-2">
                                    <span className="text-xl font-black text-white">{(plan.prices as any)[currency]}</span>
                                    {(plan.prices as any)[currency] !== 'Free' && <span className="text-[8px] text-slate-500 uppercase font-bold">/mo</span>}
                                </div>
                            </div>

                            <div className="space-y-2 flex-1 overflow-hidden">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-1.5">
                                        <Check className="w-2.5 h-2.5 text-emerald-500 mt-0.5 shrink-0" />
                                        <span className="text-[9px] text-slate-400 font-medium leading-tight">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={() => handleUpgrade(plan.id as SubscriptionTier)}
                                disabled={plan.id === currentTier || !!loading}
                                className={`w-full mt-3 h-7 rounded-lg font-black uppercase text-[8px] tracking-[0.1em] transition-all ${plan.id === currentTier ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-950 hover:bg-emerald-400 hover:text-white shadow-md'}`}
                            >
                                {loading === plan.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : plan.id === currentTier ? 'Active' : 'Upgrade'}
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                    <p className="text-[9px] text-slate-600 max-w-lg leading-relaxed">
                        Sustainable pricing for AI infrastructure. Verify your details before upgrading.
                    </p>
                    <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest gap-1.5 h-auto py-1">
                        <ArrowLeft className="w-3 h-3" />
                        Back
                    </Button>
                </div>
            </div>
        </div>
    );
}

