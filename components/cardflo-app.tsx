"use client";

import { useState, useEffect } from "react";
import { AppStatus, CardData } from "@/lib/types";
import { extractCardData } from "@/lib/gemini";
import { saveCard } from "@/lib/supabase-service";
import { AuthScreen } from "@/components/auth-screen";
import { ScannerScreen } from "@/components/scanner-screen";
import { ReviewScreen } from "@/components/review-screen";
import { Button } from "@/components/ui/shared";
import { Loader2, Zap, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";

export default function CardfloApp() {
    const [status, setStatus] = useState<AppStatus>("AUTHENTICATING");
    const [session, setSession] = useState<Session | null>(null);
    const [currentCard, setCurrentCard] = useState<CardData | null>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);

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

    const handleCapture = async (imageBase64: string) => {
        // Use env var or ask. For now assuming env var for commercial app
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            alert("Missing Gemini API Key in Environment");
            return;
        }

        setStatus("EXTRACTING");
        setProcessedImage(imageBase64);

        try {
            const data = await extractCardData(imageBase64, apiKey);
            setCurrentCard(data);
            setStatus("REVIEWING");
        } catch (error) {
            console.error(error);
            alert("Failed to extract data. Please try again.");
            setStatus("SCANNING");
        }
    };

    const handleSave = async (data: CardData) => {
        if (!session?.user) return;
        setStatus("SAVING");
        try {
            const success = await saveCard(data, session.user.id);
            if (!success) throw new Error("Save failed");

            setStatus("SUCCESS");
            setTimeout(() => {
                setStatus("IDLE");
                setCurrentCard(null);
            }, 2000);
        } catch (error) {
            console.error(error);
            alert("Failed to save card.");
            setStatus("REVIEWING");
        }
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
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 text-center space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                    <Loader2 className="w-12 h-12 text-emerald-400 animate-spin relative z-10" />
                </div>
                <h2 className="text-xl font-medium text-white">Analyzing Card...</h2>
                <p className="text-slate-400">Gemini is reading the text pixels.</p>
            </div>
        );
    }

    if (status === "REVIEWING" && currentCard) {
        return (
            <ReviewScreen
                initialData={currentCard}
                onSave={handleSave}
                onDiscard={() => setStatus("IDLE")}
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
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Cardflo</h1>
                    <p className="text-slate-400 text-xs">{session?.user.email}</p>
                </div>
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
                        <div className="text-2xl font-bold text-white">0</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Today</div>
                    </div>
                    <div className="glass-panel p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-white">0</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
