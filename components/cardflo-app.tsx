"use client";

import { useState, useEffect } from "react";
import { AppStatus, CardData } from "@/lib/types";
import { ReferralUI } from "@/components/referral-ui";
import { extractCardData } from "@/lib/gemini";
import { AdminDashboard } from "@/components/admin-dashboard";
import { saveCard, getStats, saveDraft, deleteDraft, checkDuplicateLead } from "@/lib/supabase-service";
import { canScan, incrementUsage } from "@/lib/paywall-service";
import { AuthScreen } from "@/components/auth-screen";
import { ScannerScreen } from "@/components/scanner-screen";
import { ReviewScreen } from "@/components/review-screen";
import { LeadsScreen } from "@/components/leads-screen";
import { PaywallUI } from "@/components/paywall-ui";
import { Button } from "@/components/ui/shared";
import { Loader2, Zap, LogOut, Database, CreditCard, Gift, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { SubscriptionTier, getUserUsage, getUserProfile } from "@/lib/paywall-service";

export default function CardfloApp() {
    const [status, setStatus] = useState<AppStatus>("AUTHENTICATING");
    const [session, setSession] = useState<Session | null>(null);
    const [currentCard, setCurrentCard] = useState<CardData | null>(null);
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [stats, setStats] = useState<{ today: number, total: number }>({ today: 0, total: 0 });
    const [isIgnoringDuplicate, setIsIgnoringDuplicate] = useState(false);
    const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("starter");
    const [usageStats, setUsageStats] = useState<{ count: number; bonus: number }>({ count: 0, bonus: 0 });
    const [referralCode, setReferralCode] = useState<string>("");
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setStatus(session ? "IDLE" : "AUTHENTICATING");
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setStatus(session ? "IDLE" : "AUTHENTICATING");
        });

        return () => subscription.unsubscribe();
    }, []);

    // Fetch stats and paywall info whenever we return to IDLE
    useEffect(() => {
        if (status === "IDLE" && session?.user.id) {
            getStats(session.user.id).then(setStats);
            getUserProfile(session.user.id).then(profile => {
                if (profile?.subscription_tier) setSubscriptionTier(profile.subscription_tier as SubscriptionTier);
                if (profile?.referral_code) setReferralCode(profile.referral_code);
                if ((profile as any)?.is_admin) setIsAdmin(true);
            });
            getUserUsage(session.user.id).then(usage => {
                if (usage) setUsageStats({ count: usage.scans_count || 0, bonus: usage.bonus_scans_remaining || 0 });
            });
        }
    }, [status, session]);

    const handleCapture = async (imageBase64: string) => {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("CardfloApp: Missing NEXT_PUBLIC_GEMINI_API_KEY");
            alert("Missing Gemini API Key in Environment");
            return;
        }

        if (session?.user.id) {
            const { allowed, reason, warning } = await canScan(session.user.id);
            if (!allowed) {
                setStatus("PAYWALL");
                return;
            }
            if (warning) {
                console.warn("User is approaching 80% of their scan limit.");
            }
        }

        console.log("CardfloApp: Starting extraction for captured image...");
        setStatus("EXTRACTING");

        // If we are already reviewing a card, this must be the back side
        if (currentCard) {
            setBackImage(imageBase64);
            setStatus("REVIEWING");
            return;
        }

        setFrontImage(imageBase64);

        try {
            console.log("CardfloApp: Sending to Gemini...");
            const data = await extractCardData(imageBase64, apiKey);
            console.log("CardfloApp: Extraction successful", data);

            // Per User Requirement: Check for duplicates IMMEDIATELY after extraction (Draft Phase)
            const hasDuplicate = await checkDuplicateLead(
                data.email,
                data.firstName,
                data.lastName,
                session!.user.id,
                data.phone,
                data.company
            );

            const cardWithDupeStatus = {
                ...data,
                isDuplicate: hasDuplicate
            };

            // Save as draft immediately for persistence/confirmation step
            if (session?.user.id) {
                const draftId = await saveDraft(cardWithDupeStatus, session.user.id);
                setCurrentDraftId(draftId);
            }

            setCurrentCard(cardWithDupeStatus);
            setStatus("REVIEWING");
        } catch (err: any) {
            console.error("CardfloApp: Extraction error", err);
            setStatus("IDLE");
            alert(`Extraction Error: ${err.message || "The AI could not read the card reliably."}`);
        }
    };

    const handleSave = async (data: CardData) => {
        if (!session?.user) return;

        // Duplicate check now handled at extraction/review level.
        // If the user is at this stage and clicks save, we proceed (ignoring the flag if they chose to)

        setStatus("SAVING");
        try {
            const finalData = {
                ...data,
                imageUrl: frontImage || undefined,
                backImage: backImage || undefined,
                scannedAt: new Date().toISOString()
            };
            const success = await saveCard(finalData, session.user.id);
            if (!success) throw new Error("Save failed");

            // Increment paywall usage
            await incrementUsage(session.user.id);

            setStatus("SUCCESS");
            // Cleanup draft
            if (currentDraftId) {
                await deleteDraft(currentDraftId);
                setCurrentDraftId(null);
            }

            setTimeout(() => {
                setStatus("IDLE");
                setCurrentCard(null);
                setFrontImage(null);
                setBackImage(null);
                setIsIgnoringDuplicate(false);
                // Re-fetch stats
                getStats(session.user.id).then(setStats);
            }, 2000);
        } catch (error: any) {
            console.error('Save error details:', error);
            alert(`Failed to save card: ${error.message || "Unknown Database Error"}`);
            setStatus("REVIEWING");
        }
    };

    const handleDiscard = async () => {
        if (currentDraftId) {
            await deleteDraft(currentDraftId);
            setCurrentDraftId(null);
        }
        setCurrentCard(null);
        setFrontImage(null);
        setBackImage(null);
        setStatus("IDLE");
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    // Render Logic
    if (status === "AUTHENTICATING" && !session) {
        return <AuthScreen onAuthSuccess={() => setStatus("IDLE")} />;
    }

    if (status === "SCANNING") {
        return (
            <ScannerScreen
                onCapture={handleCapture}
                onCancel={() => setStatus("IDLE")}
            />
        );
    }


    if (status === "EXTRACTING") {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in duration-500">
                <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-[6px] border-emerald-500/10 rounded-full"></div>
                    <div className="absolute inset-0 border-[6px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-4xl font-black text-white tracking-tight">AI OCR Formulation [V2]...</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-tighter text-xs">Transforming pixels to data strings</p>
                </div>
            </div>
        );
    }

    if (status === "LEADS") {
        return <LeadsScreen onBack={() => setStatus("IDLE")} />;
    }

    if (status === "REFERRAL") {
        return (
            <ReferralUI
                referralCode={referralCode}
                bonusScans={usageStats.bonus}
                onBack={() => setStatus("IDLE")}
            />
        );
    }

    if ((status as string) === "ADMIN") {
        return <AdminDashboard onBack={() => setStatus("IDLE")} />;
    }

    if (status === "REVIEWING" && currentCard) {
        return (
            <ReviewScreen
                data={currentCard}
                frontImage={frontImage || ""}
                backImage={backImage || ""}
                onSave={handleSave}
                onCancel={handleDiscard}
                onScanBack={() => setStatus("SCANNING")}
            />
        );
    }

    if (status === "PAYWALL") {
        return (
            <PaywallUI
                currentTier={subscriptionTier}
                usageCount={usageStats.count}
                bonusScans={usageStats.bonus}
                userId={session?.user.id || ''}
                email={session?.user.email || ''}
                onClose={() => setStatus("IDLE")}
            />
        );
    }

    if (status === "CHECKING") {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-8">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Integrity Check...</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Scanning database for duplicates</p>
                </div>
            </div>
        );
    }

    if (status === "SAVING") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
                <p className="text-white">Syncing to Database...</p>
            </div>
        );
    }

    if (status === "SUCCESS") {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                    <Zap className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Saved!</h2>
                <p className="text-slate-400">Lead captured successfully.</p>
            </div>
        );
    }

    if (status === "DUPLICATE_FOUND" && currentCard) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20 animate-pulse">
                    <Database className="w-10 h-10 text-amber-400" />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase">Duplicate Found</h2>
                <p className="text-slate-400 max-w-xs mb-8">
                    A lead with this email or name already exists in your database. What would you like to do?
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Button
                        size="lg"
                        className="h-16 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl"
                        onClick={() => {
                            setIsIgnoringDuplicate(true);
                            handleSave(currentCard);
                        }}
                    >
                        Ignore and Add
                    </Button>
                    <Button
                        variant="ghost"
                        size="lg"
                        className="h-16 text-slate-400 hover:text-white"
                        onClick={() => setStatus("REVIEWING")}
                    >
                        Cancel Adding
                    </Button>
                </div>
            </div>
        );
    }

    // IDLE Dashboard
    return (
        <div className="min-h-screen bg-slate-950 p-6 flex flex-col">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Cardflo</h1>
                    <p className="text-slate-400 text-xs">{session?.user.email}</p>
                </div>
                <Button
                    variant="ghost"
                    className="text-slate-500 hover:text-emerald-400 flex items-center space-x-2 px-3"
                    onClick={() => setStatus("REFERRAL")}
                >
                    <Gift className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Refer</span>
                </Button>
                <Button
                    variant="ghost"
                    className="text-slate-500 hover:text-emerald-400 flex items-center space-x-2 px-3"
                    onClick={() => setStatus("PAYWALL")}
                >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Plan</span>
                </Button>
                <Button
                    variant="ghost"
                    className="text-slate-500 hover:text-emerald-400 flex items-center space-x-2 px-3"
                    onClick={() => setStatus("LEADS")}
                >
                    <Database className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">My Leads</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-slate-500 hover:text-white">
                    <LogOut className="w-5 h-5" />
                </Button>
            </header>

            <main className="flex-1 flex flex-col justify-center items-center space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-white tracking-tight">Capture Leads<br />Instantly</h2>
                    <p className="text-slate-400 max-w-[200px] mx-auto">Turn physical cards into digital assets with AI.</p>
                </div>

                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                    <Button
                        size="lg"
                        className="w-48 h-16 text-lg relative bg-slate-900 border-slate-800 hover:bg-slate-800 transition-all font-semibold"
                        onClick={() => setStatus("SCANNING")}
                    >
                        <Zap className="w-5 h-5 mr-2 text-emerald-400" />
                        Scan Card
                    </Button>
                </div>


                <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
                    <div className="glass-panel p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-white">{stats.today}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Today</div>
                    </div>
                    <div className="glass-panel p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total</div>
                    </div>
                </div>

                {isAdmin && (
                    <Button
                        variant="ghost"
                        className="mt-4 text-slate-700 hover:text-emerald-500/50 flex items-center space-x-2 opacity-50 hover:opacity-100 transition-all"
                        onClick={() => setStatus("ADMIN")}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Admin Access</span>
                    </Button>
                )}

                <div className="mt-8 opacity-20 text-[8px] font-mono tracking-widest uppercase">
                    Build: v2.0.debug-sync
                </div>
            </main>
        </div>
    );
}
