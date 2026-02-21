"use client";

import { useState, useEffect } from "react";
import { AppStatus, CardData } from "@/lib/types";
import { ReferralUI } from "@/components/referral-ui";
import { extractCardData, enrichWithBackImage } from "@/lib/gemini";
import { AdminDashboard } from "@/components/admin-dashboard";
import { saveCard, getStats, saveDraft, deleteDraft, getDuplicateMatch } from "@/lib/supabase-service";
import { canScan, incrementUsage } from "@/lib/paywall-service";
import { AuthScreen } from "@/components/auth-screen";
import { ScannerScreen } from "@/components/scanner-screen";
import { ReviewScreen } from "@/components/review-screen";
import { LeadsScreen } from "@/components/leads-screen";
import { PaywallUI } from "@/components/paywall-ui";
import { Button } from "@/components/ui/shared";
import { Loader2, Zap, LogOut, Contact, CreditCard, Gift, ShieldCheck, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { SubscriptionTier, getUserUsage, getUserProfile } from "@/lib/paywall-service";
import { Lead } from "@/lib/types";
import { cropLogoFromImage, cropImage } from "@/lib/image-utils";

export default function CardfloApp() {
    const [status, setStatus] = useState<AppStatus>("AUTHENTICATING");
    const [session, setSession] = useState<Session | null>(null);
    const [currentCard, setCurrentCard] = useState<CardData | null>(null);
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [stats, setStats] = useState<{ today: number, total: number }>({ today: 0, total: 0 });
    const [isIgnoringDuplicate, setIsIgnoringDuplicate] = useState(false);
    const [duplicateMatch, setDuplicateMatch] = useState<Lead | null>(null);
    const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("starter");
    const [usageStats, setUsageStats] = useState<{ count: number; bonus: number }>({ count: 0, bonus: 0 });
    const [referralCode, setReferralCode] = useState<string>("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [userRole, setUserRole] = useState<'super_admin' | 'team_admin' | 'none'>('none');
    const [teamId, setTeamId] = useState<string | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const faqItems = [
        { q: 'What is Cardflo?', a: 'Cardflo is a professional web app that helps you capture and organize business card information into structured, usable contacts — quickly and without friction.' },
        { q: 'Why does Cardflo have scan limits?', a: 'Cardflo uses AI processing for every scan. Plans are structured to reflect usage and keep the platform sustainable for everyone. Clear limits ensure transparency and no surprise charges.' },
        { q: 'What happens when I reach my monthly limit?', a: 'Your scans reset automatically at the beginning of your next billing cycle. You can also upgrade your plan anytime.' },
        { q: 'Is my data private?', a: 'Yes. Your contacts belong to you. Cardflo does not sell or share user data.' },
        { q: 'Why is the free plan limited?', a: 'The free plan is designed for occasional use. Paid plans help cover infrastructure and AI processing costs while keeping Cardflo independent and sustainable.' },
        { q: 'What is the Team plan?', a: 'The Team plan allows multiple users to scan into a shared contact database, suitable for small teams and organizations.' },
        { q: 'Do you offer special access for early users?', a: 'Yes. We occasionally provide Founder access codes for early supporters and contributors.' },
    ];

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

    const refreshUsage = async (userId: string) => {
        const usage = await getUserUsage(userId);
        if (usage) setUsageStats({ count: usage.scans_count || 0, bonus: usage.bonus_scans_remaining || 0 });
    };

    // Fetch stats and paywall info whenever we return to IDLE
    useEffect(() => {
        if (status === "IDLE" && session?.user.id) {
            getStats(session.user.id).then(setStats);
            getUserProfile(session.user.id).then(async profile => {
                if (profile?.subscription_tier) setSubscriptionTier(profile.subscription_tier as SubscriptionTier);
                if (profile?.referral_code) setReferralCode(profile.referral_code);

                let effectiveTeamId = profile?.team_id || null;
                setTeamId(effectiveTeamId);

                const isSuper = (profile as any)?.is_super_admin === true;
                const isAdminOld = (profile as any)?.is_admin === true;

                if (isSuper || isAdminOld) {
                    setIsAdmin(true);
                    setUserRole('super_admin');
                } else if (effectiveTeamId) {
                    const { data: memberData } = await supabase
                        .from('team_members')
                        .select('role')
                        .eq('user_id', session.user.id)
                        .eq('team_id', effectiveTeamId)
                        .single();

                    if (memberData && ((memberData as any).role === 'owner' || (memberData as any).role === 'admin')) {
                        setIsAdmin(true);
                        setUserRole('team_admin');
                    } else {
                        setIsAdmin(false);
                        setUserRole('none');
                    }
                } else {
                    setIsAdmin(false);
                    setUserRole('none');
                }

                // Check if we need to send the post-verification onboarding email
                if (profile && !(profile as any)?.welcome_email_sent) {
                    console.log("Triggering onboarding post-verification email...");
                    fetch('/api/email/post-verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: session.user.email })
                    }).then(() => {
                        supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', session.user.id).then(
                            ({ error }) => { if (error) console.error("Failed to mark email as sent", error); }
                        );
                    }).catch(console.error);
                }
            });
            refreshUsage(session.user.id);
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
                if (reason === 'global_limit_reached') {
                    alert("Limiting today's scan due to sudden surge in scans for security reasons");
                    return;
                }
                if (reason === 'rate_limit_exceeded') {
                    alert("AI is recalibrating data models. Please wait a moment.");
                    return;
                }
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
            try {
                console.log("CardfloApp: Sending back side to Gemini for enrichment...");
                const enrichedData = await enrichWithBackImage(currentCard, imageBase64, apiKey);
                console.log("CardfloApp: Enrichment successful", enrichedData);
                setCurrentCard(enrichedData);
                setBackImage(imageBase64);
                setStatus("REVIEWING");
            } catch (err: any) {
                console.error("CardfloApp: Enrichment error", err);
                // Gracefully fallback to just saving the image if AI fails
                setBackImage(imageBase64);
                setStatus("REVIEWING");
                alert(`Back Side AI Error: ${err.message || "Could not extract text from back."}`);
            }
            return;
        }

        setFrontImage(imageBase64);

        try {
            console.log("CardfloApp: Sending to Gemini...");
            const data = await extractCardData(imageBase64, apiKey);
            console.log("CardfloApp: Extraction successful", data);

            // Per User Requirement: Get matched lead for display in ReviewScreen
            const matchedLead = await getDuplicateMatch(
                data.email,
                data.firstName,
                data.lastName,
                session!.user.id,
                data.phone,
                data.company
            );

            const cardWithDupeStatus = {
                ...data,
                isDuplicate: !!matchedLead
            };

            setDuplicateMatch(matchedLead);

            // Attempt to crop the logo if coordinates were found
            let finalCardData = cardWithDupeStatus;
            if (data.logo_box && data.logo_box.length === 4) {
                console.log("CardfloApp: Cropping logo from scan...");
                const croppedLogoBase64 = await cropLogoFromImage(imageBase64, data.logo_box);
                if (croppedLogoBase64) {
                    finalCardData = {
                        ...finalCardData,
                        logo_fallback_base64: croppedLogoBase64
                    };
                }
            }

            // Attempt to crop the entire card perfectly to its edges
            if (data.card_box && data.card_box.length === 4) {
                console.log("CardfloApp: Cropping edge-to-edge card...");
                const croppedCardBase64 = await cropImage(imageBase64, data.card_box);
                if (croppedCardBase64) {
                    setFrontImage(croppedCardBase64);
                }
            }

            // Save as draft immediately for persistence/confirmation step
            if (session?.user.id) {
                const draftId = await saveDraft(finalCardData, session.user.id);
                setCurrentDraftId(draftId);
            }

            setCurrentCard(finalCardData);
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
        setDuplicateMatch(null);
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
                    <h3 className="text-4xl font-black text-white tracking-tight">Got it! Converting card to data...</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-tighter text-xs">Hang tight, this takes a few seconds.</p>
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
        return <AdminDashboard onBack={() => setStatus("IDLE")} userRole={userRole as any} teamId={teamId} />;
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
                duplicateMatch={duplicateMatch}
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
                onRedeemSuccess={() => {
                    if (session?.user.id) {
                        refreshUsage(session.user.id);
                    }
                }}
            />
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


    // IDLE Dashboard
    return (
        <div className="min-h-screen bg-slate-950 p-6 flex flex-col">
            <header className="flex justify-between items-center mb-8">
                <div className="flex flex-col items-start gap-1">
                    <img src="/logo.png" alt="Cardflo" className="h-14 w-auto object-contain" />
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
                    <span className="text-xs font-bold uppercase tracking-widest">Upgrade</span>
                </Button>
                <Button
                    variant="ghost"
                    className="text-slate-500 hover:text-emerald-400 flex items-center space-x-2 px-3"
                    onClick={() => setStatus("LEADS")}
                >
                    <Contact className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">My Cards</span>
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
                        className="w-48 h-16 text-lg relative bg-slate-900 border-slate-700 hover:bg-slate-800 transition-all font-bold text-white shadow-lg"
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
                    <div className="flex gap-2 mt-4">
                        <Button
                            variant="ghost"
                            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-400 hover:text-slate-950 flex items-center space-x-2 transition-all px-6 py-4 rounded-2xl"
                            onClick={() => setStatus("ADMIN")}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">{userRole === 'super_admin' ? 'Super Admin' : 'Team Admin'}</span>
                        </Button>
                    </div>
                )}

                {/* FAQ Section */}
                <div className="w-full max-w-2xl mt-12 space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 text-center mb-6">Frequently Asked Questions</h3>
                    {faqItems.map((item, i) => (
                        <div
                            key={i}
                            className="glass-panel rounded-2xl border border-slate-800 overflow-hidden transition-all duration-300 hover:border-slate-700"
                        >
                            <button
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                className="w-full flex items-center justify-between p-5 text-left"
                            >
                                <span className="text-sm font-bold text-white pr-4">{item.q}</span>
                                <ChevronDown className={`w-4 h-4 text-emerald-400 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 pb-5' : 'max-h-0'}`}>
                                <p className="px-5 text-xs text-slate-400 leading-relaxed">{item.a}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 opacity-20 text-[8px] font-mono tracking-widest uppercase">
                    Build: v3.0.NUCLEAR-SYNC
                </div>
            </main>
        </div>
    );
}
