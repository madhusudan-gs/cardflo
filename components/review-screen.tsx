import { useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui/shared";
import { CardData } from "@/lib/types";
import { ArrowLeft, Save, Trash2, Check, Sparkles, Database, AlertTriangle } from "lucide-react";

interface ReviewScreenProps {
    data: CardData;
    frontImage: string;
    backImage: string;
    onSave: (data: CardData) => void;
    onCancel: () => void;
    onScanBack: () => void;
}

export function ReviewScreen({ data: initialData, frontImage, backImage, onSave, onCancel, onScanBack }: ReviewScreenProps) {
    const [data, setData] = useState<CardData>(initialData);
    const [viewingSide, setViewingSide] = useState<"front" | "back">("front");

    const handleChange = (field: keyof CardData, value: string) => {
        setData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 glass-panel border-b border-slate-800 rounded-none px-4 py-4 flex items-center justify-between backdrop-blur-xl">
                <Button variant="ghost" size="sm" onClick={onCancel} className="-ml-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Discard
                </Button>
                <div className="flex flex-col items-center">
                    <span className="font-black text-emerald-400 tracking-tighter uppercase text-xs">Review Card</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">Lead Verification</span>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 pointer-events-none">
                    Save
                </Button>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="h-full flex flex-col lg:flex-row gap-0 lg:gap-8 p-4 lg:p-8 overflow-y-auto lg:overflow-hidden">
                    {/* Left: Card Preview */}
                    <div className="w-full lg:w-1/2 flex flex-col space-y-4 mb-8 lg:mb-0">
                        <div className="relative aspect-[3/2] rounded-[2.5rem] overflow-hidden border border-slate-700 bg-slate-900 shadow-3xl ring-1 ring-white/5 group">
                            <img
                                src={viewingSide === "front" ? frontImage : (backImage || frontImage)}
                                alt="Captured Card"
                                className="w-full h-full object-cover transition-all duration-500"
                            />

                            {/* Side Toggle Overlay */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 bg-slate-950/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button
                                    onClick={() => setViewingSide("front")}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewingSide === "front" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"}`}
                                >
                                    Front
                                </button>
                                <button
                                    onClick={() => backImage ? setViewingSide("back") : null}
                                    disabled={!backImage}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewingSide === "back" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"} ${!backImage && "opacity-30 cursor-not-allowed"}`}
                                >
                                    {backImage ? "Back" : "Back (Empty)"}
                                </button>
                            </div>
                        </div>

                        {!backImage ? (
                            <Button
                                variant="outline"
                                onClick={onScanBack}
                                className="w-full h-14 border-slate-700 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 rounded-2xl border-dashed bg-slate-900/40 flex items-center justify-center gap-2 group transition-all"
                            >
                                <Sparkles className="w-4 h-4 text-emerald-500 group-hover:animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-wider">Scan Back Side (Optional)</span>
                            </Button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Both Sides Captured</span>
                            </div>
                        )}

                        <div className="hidden lg:block bg-slate-900/60 border border-slate-800 p-6 rounded-3xl">
                            <p className="text-slate-400 text-xs font-medium leading-relaxed italic opacity-70">
                                "The AI has parsed the card details from the front. Capturing the back provides extra context like social links or multiple offices."
                            </p>
                        </div>
                    </div>

                    {/* Right: Extracted Form */}
                    <div className="w-full lg:w-1/2 flex flex-col bg-slate-900/40 border border-slate-700/50 rounded-[3rem] p-8 lg:p-10 space-y-8 backdrop-blur-md lg:overflow-y-auto scrollbar-hide shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                            <h3 className="text-2xl font-black text-white tracking-tight">Extracted Data</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">First Name</Label>
                                <Input
                                    value={data.firstName}
                                    onChange={(e) => handleChange("firstName", e.target.value)}
                                    className="bg-slate-800/50 border-slate-700 rounded-2xl focus:ring-emerald-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</Label>
                                <Input
                                    value={data.lastName}
                                    onChange={(e) => handleChange("lastName", e.target.value)}
                                    className="bg-slate-800/50 border-slate-700 rounded-2xl focus:ring-emerald-500/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Job Title</Label>
                            <Input
                                value={data.jobTitle}
                                onChange={(e) => handleChange("jobTitle", e.target.value)}
                                className="bg-slate-800/50 border-slate-700 rounded-2xl focus:ring-emerald-500/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company</Label>
                            <Input
                                value={data.company}
                                onChange={(e) => handleChange("company", e.target.value)}
                                className="bg-slate-800/50 border-slate-700 rounded-2xl focus:ring-emerald-500/50"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</Label>
                                <Input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    className="bg-slate-800/50 border-slate-700 rounded-2xl focus:ring-emerald-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone</Label>
                                <Input
                                    type="tel"
                                    value={data.phone}
                                    onChange={(e) => handleChange("phone", e.target.value)}
                                    className="bg-slate-800/50 border-slate-700 rounded-2xl focus:ring-emerald-500/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact Notes</Label>
                            <Textarea
                                value={data.notes}
                                onChange={(e) => handleChange("notes", e.target.value)}
                                className="bg-slate-800/50 border-slate-700 rounded-[2rem] h-32 focus:ring-emerald-500/50 resize-none p-5"
                                placeholder="Transformation details..."
                            />
                        </div>

                        {/* Partial Capture Warning */}
                        {data.isPartial && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center gap-3 text-red-400">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black uppercase tracking-tight">Partial Data Captured</span>
                                        <span className="text-[10px] font-bold opacity-80 uppercase leading-none">Detection: Obstruction or Obscured Info</span>
                                    </div>
                                </div>
                                <p className="text-xs text-red-500/70 font-medium leading-relaxed italic">
                                    "The AI detects something (like fingers or objects) might be covering part of the card. Please ensure the card is fully visible for 100% accuracy."
                                </p>
                            </div>
                        )}

                        {/* Duplicate Warning Prompt */}
                        {data.isDuplicate && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30">
                                        <Database className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-amber-500 uppercase tracking-tight">Potential Duplicate Detected</span>
                                        <span className="text-[10px] text-amber-500/70 font-bold uppercase">Email or name already exists in database</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => onSave(data)}
                                        variant="outline"
                                        className="flex-1 h-12 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                                    >
                                        Sync Anyway
                                    </Button>
                                    <Button
                                        onClick={onCancel}
                                        className="flex-1 h-12 bg-slate-800 text-slate-300 hover:bg-red-500 hover:text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest transition-all border-none"
                                    >
                                        Discard Draft
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 mt-auto">
                            {!data.isDuplicate ? (
                                <>
                                    <Button onClick={() => onSave(data)} className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                        <Check className="w-6 h-6" />
                                        Confirm & Sync
                                    </Button>
                                    <div className="text-center mt-6 pb-2">
                                        <button
                                            onClick={onCancel}
                                            className="text-xs text-slate-400 hover:text-red-400 font-bold uppercase tracking-widest transition-colors border-b border-transparent hover:border-red-400/50 pb-0.5"
                                        >
                                            Cancel & Rescan
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] px-4">
                                    Review data above to decide how to proceed with this duplicate
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
