import { useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui/shared";
import { CardData } from "@/lib/types";
import { ArrowLeft, Save, Trash2, Check } from "lucide-react";

interface ReviewScreenProps {
    data: CardData;
    image: string;
    onSave: (data: CardData) => void;
    onCancel: () => void;
}

export function ReviewScreen({ data: initialData, image, onSave, onCancel }: ReviewScreenProps) {
    const [data, setData] = useState<CardData>(initialData);

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
                        <div className="relative aspect-[3/2] rounded-[2.5rem] overflow-hidden border border-slate-700 bg-slate-900 shadow-3xl ring-1 ring-white/5">
                            {image && <img src={image} alt="Captured Card" className="w-full h-full object-cover" />}
                        </div>
                        <div className="hidden lg:block bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl">
                            <p className="text-blue-400 text-xs font-bold leading-relaxed italic">
                                "The AI has parsed the card details. Please verify the fields on the right before sinking to your leads list."
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
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">AI Summary</Label>
                            <Textarea
                                value={data.notes}
                                onChange={(e) => handleChange("notes", e.target.value)}
                                className="bg-slate-800/50 border-slate-700 rounded-[2rem] h-32 focus:ring-emerald-500/50 resize-none p-5"
                                placeholder="Transformation details..."
                            />
                        </div>

                        <div className="pt-4 mt-auto">
                            <Button onClick={() => onSave(data)} className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-3xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
                                <Check className="w-6 h-6" />
                                Confirm & Sync
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
