import { useState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui/shared";
import { CardData } from "@/lib/types";
import { ArrowLeft, Save, Trash2, Check } from "lucide-react";

interface ReviewScreenProps {
    initialData: CardData;
    onSave: (data: CardData) => void;
    onDiscard: () => void;
}

export function ReviewScreen({ initialData, onSave, onDiscard }: ReviewScreenProps) {
    const [data, setData] = useState<CardData>(initialData);

    const handleChange = (field: keyof CardData, value: string) => {
        setData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 glass-panel border-b-0 border-x-0 rounded-none px-4 py-4 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={onDiscard} className="-ml-2 text-slate-400">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Discard
                </Button>
                <span className="font-semibold text-emerald-400">Review Card</span>
                <Button variant="ghost" size="sm" className="opacity-0 pointer-events-none">
                    Save
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input
                            value={data.firstName}
                            onChange={(e) => handleChange("firstName", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input
                            value={data.lastName}
                            onChange={(e) => handleChange("lastName", e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input
                        value={data.jobTitle}
                        onChange={(e) => handleChange("jobTitle", e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                        value={data.company}
                        onChange={(e) => handleChange("company", e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                        type="email"
                        value={data.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                        type="tel"
                        value={data.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Generic Notes</Label>
                    <Textarea
                        value={data.notes}
                        onChange={(e) => handleChange("notes", e.target.value)}
                        className="h-24"
                    />
                </div>
            </div>

            <div className="p-4 glass-panel border-t border-slate-800 safe-area-bottom">
                <Button onClick={() => onSave(data)} className="w-full bg-emerald-500 hover:bg-emerald-600">
                    <Check className="w-4 h-4 mr-2" />
                    Confirm & Save
                </Button>
            </div>
        </div>
    );
}
