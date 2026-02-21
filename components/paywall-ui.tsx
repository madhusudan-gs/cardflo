
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
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center">
            {/* Standard Header with Back Button */}
            <header className="w-full bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 p-4 border-b border-slate-800">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <h1 className="text-xl font-bold hidden sm:block">Upgrade Your Plan</h1>
                    </div>
                    {/* Currency Selector moved to top right for better balance */}
                    <div className="bg-slate-900 p-1 rounded-lg flex border border-slate-800">
                        <button
                            onClick={() => setCurrency('INR')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${currency === 'INR' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            INR (₹)
                        </button>
                        <button
                            disabled
                            className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide text-slate-600 cursor-not-allowed hidden sm:block"
                        >
                            USD ($)
                        </button>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-32">
                {/* Usage Bar */}
                <div className="glass-panel p-6 rounded-2xl border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="flex-1 w-full min-w-0 z-10">
                        <div className="flex justify-between items-baseline mb-3">
                            <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Monthly Scan Usage</h2>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">{currentTier} Tier</span>
                        </div>
                        <div className="h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-[2px]">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${isAtLimit ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-600 to-cyan-500 relative'}`}
                                style={{ width: `${usagePercent}%` }}
                            >
                                {!isAtLimit && <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/20 blur-sm rounded-full" />}
                            </div>
                        </div>
                        <div className="flex justify-between mt-3">
                            <p className="text-lg font-black text-white">{usageCount} <span className="text-slate-500 font-medium">/ {totalLimit} scans</span></p>
                            {isAtLimit && <span className="text-sm font-bold text-red-500 uppercase tracking-wider animate-pulse flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Limit Reached</span>}
                        </div>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pt-4">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`glass-panel p-6 rounded-2xl border transition-all duration-300 relative flex flex-col h-full ${plan.id === currentTier ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 lg:-translate-y-4 shadow-2xl shadow-emerald-500/20 z-10' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'}`}
                        >
                            {plan.id === currentTier && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-xs font-black uppercase tracking-wider px-4 py-1 rounded-full text-white shadow-lg whitespace-nowrap">
                                    Current Plan
                                </div>
                            )}

                            <div className="mb-6 mt-2 text-center">
                                <h3 className="text-base font-black tracking-widest text-slate-400 uppercase mb-2">{plan.name}</h3>
                                <div className="flex items-baseline justify-center gap-1 border-b border-slate-800/80 pb-6 mb-6">
                                    <span className="text-4xl font-black text-white">{(plan.prices as any)[currency]}</span>
                                    {(plan.prices as any)[currency] !== 'Free' && <span className="text-sm text-slate-500 uppercase font-bold">/mo</span>}
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="bg-emerald-500/20 p-1 rounded-full shrink-0 mt-0.5">
                                            <Check className="w-3 h-3 text-emerald-400" />
                                        </div>
                                        <span className="text-sm text-slate-300 font-medium leading-snug">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={() => handleUpgrade(plan.id as SubscriptionTier)}
                                disabled={plan.id === currentTier || !!loading}
                                className={`w-full mt-8 h-12 rounded-xl font-black uppercase text-sm tracking-widest transition-all ${plan.id === currentTier ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' : 'bg-white text-slate-950 hover:bg-emerald-400 hover:text-white hover:scale-[1.02] shadow-xl'}`}
                            >
                                {loading === plan.id ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : plan.id === currentTier ? 'Active' : 'Upgrade'}
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="text-center pt-8">
                    <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                        Sustainable, transparent pricing for AI infrastructure. Contact support for custom volume negotiations or enterprise SLAs.
                    </p>
                </div>
            </main>
        </div>
    );
}

