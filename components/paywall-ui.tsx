
import React, { useState, useEffect } from 'react';
import { Button } from './ui/shared';
import { Zap, Check, Share2, AlertTriangle, ShieldCheck, Users, Globe, Loader2 } from 'lucide-react';
import { SubscriptionTier, PLAN_CONFIGS } from '@/lib/paywall-service';

interface PaywallUIProps {
    currentTier: SubscriptionTier;
    usageCount: number;
    bonusScans: number;
    userId: string;
    email: string;
    onClose?: () => void;
}

export function PaywallUI({ currentTier, usageCount, bonusScans, userId, email, onClose }: PaywallUIProps) {
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
            scans: 5,
            prices: { USD: 'Free', INR: 'Free' },
            features: ['5 Scans/mo', 'Mobile App Access', 'AI OCR Extraction'],
            export: false
        },
        {
            id: 'lite',
            name: 'Lite',
            scans: 30,
            prices: { USD: '$9', INR: '₹799' },
            features: ['30 Scans/mo', 'CSV/Sheets Export', 'Email Support'],
            export: true
        },
        {
            id: 'standard',
            name: 'Standard',
            scans: 120,
            prices: { USD: '$24', INR: '₹1999' },
            features: ['120 Scans/mo', 'CSV/Sheets Export', 'Priority AI Extraction'],
            export: true
        },
        {
            id: 'pro',
            name: 'Pro',
            scans: 500,
            prices: { USD: '$49', INR: '₹3999' },
            features: ['500 Scans/mo', 'Unlimited Exports', 'Dedicated Support'],
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
                // Razorpay Checkout
                const res = await fetch('/api/razorpay/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                        alert('Payment successful! Your plan will be updated shortly.');
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
            console.error('Checkout error:', err);
            alert(`Checkout failed: ${err.message}`);
        } finally {
            setLoading(null);
        }
    };

    // Load Razorpay Script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 pb-20 overflow-y-auto scrollbar-hide">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Usage Panel */}
                <div className="glass-panel p-8 rounded-[2rem] border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[80px] rounded-full" />
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-1">Current Usage</h2>
                            <p className="text-3xl font-black">{usageCount} / {totalLimit} <span className="text-xs text-slate-500 uppercase">Scans Used</span></p>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plan: {currentTier}</span>
                        </div>
                    </div>

                    <div className="h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${isAtLimit ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-emerald-600 to-cyan-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>

                    {isAtLimit && (
                        <div className="mt-4 flex items-center gap-2 text-red-400 animate-pulse">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Monthly limit reached. Upgrade to continue syncing.</span>
                        </div>
                    )}
                </div>

                {/* Currency Selector */}
                <div className="flex justify-center">
                    <div className="bg-slate-900 p-1 rounded-2xl flex border border-slate-800">
                        <button
                            onClick={() => setCurrency('INR')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currency === 'INR' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            India (INR)
                        </button>
                        <button
                            onClick={() => setCurrency('USD')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currency === 'USD' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            Global (USD)
                        </button>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`glass-panel p-6 rounded-[2rem] border transition-all duration-300 relative flex flex-col ${plan.id === currentTier ? 'border-emerald-500 bg-emerald-500/10 ring-4 ring-emerald-500/5 scale-105 z-10' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'}`}
                        >
                            {plan.id === currentTier && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-[10px] font-black uppercase px-3 py-1 rounded-full text-white shadow-lg">
                                    Current Plan
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-lg font-black tracking-tight">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-2xl font-black">{(plan.prices as any)[currency]}</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">/ month</span>
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                                        <span className="text-xs text-slate-300 font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={() => handleUpgrade(plan.id as SubscriptionTier)}
                                disabled={plan.id === currentTier || !!loading}
                                className={`w-full mt-8 h-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.1em] transition-all ${plan.id === currentTier ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-950 hover:bg-emerald-400 hover:text-white shadow-xl'}`}
                            >
                                {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : plan.id === currentTier ? 'Active' : 'Get Started'}
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="text-center">
                    <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest">
                        Continue with free plan
                    </Button>
                </div>
            </div>
        </div>
    );
}

