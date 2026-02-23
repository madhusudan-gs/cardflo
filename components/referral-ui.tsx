"use client";

import { useState } from "react";
import { Button } from "./ui/shared";
import { Copy, Gift, Share2, CheckCircle2, ChevronLeft } from "lucide-react";

interface ReferralUIProps {
    referralCode: string;
    bonusScans: number;
    onBack: () => void;
}

export function ReferralUI({ referralCode, bonusScans, onBack }: ReferralUIProps) {
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareApp = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Cardflo - AI Business Card Scanner',
                text: `Join me on Cardflo and get bonus scans! Use my code: ${referralCode}`,
                url: window.location.origin,
            });
        }
    };

    return (
        <div className="min-h-[100dvh] bg-slate-950 text-slate-200 flex flex-col p-6">
            <header className="flex items-center mb-8">
                <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400 mr-2">
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <h2 className="text-2xl font-bold text-white tracking-tight">Refer & Earn</h2>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center space-y-8 max-w-sm mx-auto">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-2">
                    <Gift className="w-10 h-10 text-emerald-400" />
                </div>

                <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-white">Share the magic</h3>
                    <p className="text-slate-400 text-sm">
                        Invite your colleagues and friends. When they sign up, you both get <span className="text-emerald-400 font-bold">+5 bonus scans</span>.
                    </p>
                </div>

                <div className="w-full space-y-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Your Referral Code</p>
                        <div className="text-3xl font-black text-white tracking-[0.2em] font-mono uppercase">
                            {referralCode}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                                onClick={copyCode}
                            >
                                {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
                                {copied ? "Copied!" : "Copy Code"}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-12 h-12 border-slate-800 hover:bg-slate-800 rounded-xl flex items-center justify-center p-0"
                                onClick={shareApp}
                            >
                                <Share2 className="w-5 h-5 text-slate-400" />
                            </Button>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Bonus Scans Earned</p>
                            <div className="text-2xl font-bold text-emerald-400 mt-1">+{bonusScans}</div>
                        </div>
                        <div className="w-12 h-12 bg-emerald-500/5 rounded-full flex items-center justify-center border border-emerald-500/10">
                            <Gift className="w-6 h-6 text-emerald-500/40" />
                        </div>
                    </div>
                </div>

                <div className="text-center text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                    Bonus scans are valid for the current billing cycle.
                </div>
            </main>
        </div>
    );
}
