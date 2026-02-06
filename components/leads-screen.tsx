"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/shared";
import { Lead } from "@/lib/types";
import { updateLead } from "@/lib/supabase-service";
import { ChevronLeft, Trash2, Copy, Search, ExternalLink, Mail, Phone, MapPin, Edit2, Check, X, Building2, User2, Briefcase, Download } from "lucide-react";


export function LeadsScreen({ onBack }: { onBack: () => void }) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<Lead>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeads = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('created_by', session.user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching leads:", error);
            } else {
                setLeads(data || []);
            }
            setLoading(false);
        };

        fetchLeads();
    }, []);

    const deleteLead = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;

        const { error } = await (supabase
            .from('leads') as any)
            .delete()
            .eq('id', id);

        if (error) {
            alert("Delete failed: " + error.message);
        } else {
            setLeads(leads.filter(l => l.id !== id));
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    const filteredLeads = leads.filter(l =>
        `${l.first_name} ${l.last_name} ${l.company} ${l.email} ${l.notes}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStartEdit = (lead: Lead) => {
        setEditingId(lead.id);
        setEditValues(lead);
    };

    const handleSaveEdit = async (id: string) => {
        setSavingId(id);
        const success = await updateLead(id, editValues);
        if (success) {
            setLeads(leads.map(l => l.id === id ? { ...l, ...editValues } as Lead : l));
            setEditingId(null);
        } else {
            alert("Failed to update lead.");
        }
        setSavingId(null);
    };

    const handleFieldChange = (field: keyof Lead, value: string) => {
        setEditValues(prev => ({ ...prev, [field]: value }));
    };

    const exportToCSV = () => {
        if (leads.length === 0) return;

        const headers = ["First Name", "Last Name", "Job Title", "Company", "Email", "Phone", "Website", "Address", "Notes", "Scanned At"];
        const rows = leads.map(l => [
            l.first_name || "",
            l.last_name || "",
            l.job_title || "",
            l.company || "",
            l.email || "",
            l.phone || "",
            l.website || "",
            l.address || "",
            l.notes || "",
            new Date(l.scanned_at || l.created_at).toLocaleString()
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${(cell as string).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `cardflo_leads_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
            <header className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
                <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h2 className="text-xl font-bold text-white">My Captured Leads</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={exportToCSV}
                        className="text-xs font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 border border-slate-800 hover:border-emerald-500/50"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </Button>
                    <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 uppercase">
                        {leads.length} Total
                    </div>
                </div>
            </header>

            <div className="p-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search names, companies, emails..."
                        className="w-full bg-slate-900 border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm">Accessing Database...</p>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <p className="text-sm">No leads found.</p>
                    </div>
                ) : (
                    filteredLeads.map((lead) => (
                        <div key={lead.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 hover:border-emerald-500/30 transition-all group animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 space-y-3">
                                    {editingId === lead.id ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">First Name</p>
                                                    <input
                                                        value={editValues.first_name || ""}
                                                        onChange={(e) => handleFieldChange("first_name", e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Last Name</p>
                                                    <input
                                                        value={editValues.last_name || ""}
                                                        onChange={(e) => handleFieldChange("last_name", e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Job Title</p>
                                                <input
                                                    value={editValues.job_title || ""}
                                                    onChange={(e) => handleFieldChange("job_title", e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Company</p>
                                                <input
                                                    value={editValues.company || ""}
                                                    onChange={(e) => handleFieldChange("company", e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-lg font-bold text-white leading-tight">
                                                {lead.first_name} {lead.last_name}
                                            </h3>
                                            <p className="text-emerald-400 text-sm font-medium">{lead.job_title}</p>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-tight mt-1">{lead.company}</p>
                                        </>
                                    )}
                                </div>
                                <div className="flex space-x-1">
                                    {editingId === lead.id ? (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleSaveEdit(lead.id)}
                                                disabled={savingId === lead.id}
                                                className="w-10 h-10 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                            >
                                                <Check className="w-5 h-5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingId(null)}
                                                className="w-10 h-10 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                            >
                                                <X className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Button variant="ghost" size="icon" onClick={() => handleStartEdit(lead)} className="w-8 h-8 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteLead(lead.id)} className="w-8 h-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>Scanned on {new Date(lead.scanned_at || lead.created_at).toLocaleDateString()}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3 border-t border-slate-800/50 pt-4">
                                {editingId === lead.id ? (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Email</p>
                                            <input
                                                value={editValues.email || ""}
                                                onChange={(e) => handleFieldChange("email", e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Phone</p>
                                            <input
                                                value={editValues.phone || ""}
                                                onChange={(e) => handleFieldChange("phone", e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Website</p>
                                            <input
                                                value={editValues.website || ""}
                                                onChange={(e) => handleFieldChange("website", e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Address</p>
                                            <textarea
                                                value={editValues.address || ""}
                                                onChange={(e) => handleFieldChange("address", e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none min-h-[60px] resize-none"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {lead.email && (
                                            <div className="flex items-center justify-between text-xs group/item">
                                                <div className="flex items-center text-slate-400">
                                                    <Mail className="w-3.5 h-3.5 mr-2" />
                                                    <span>{lead.email}</span>
                                                </div>
                                                <button onClick={() => copyToClipboard(lead.email)} className="text-slate-600 hover:text-emerald-400 opacity-0 group-hover/item:opacity-100">
                                                    <Copy className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        {lead.phone && (
                                            <div className="flex items-center justify-between text-xs group/item">
                                                <div className="flex items-center text-slate-400">
                                                    <Phone className="w-3.5 h-3.5 mr-2" />
                                                    <span>{lead.phone}</span>
                                                </div>
                                                <button onClick={() => copyToClipboard(lead.phone)} className="text-slate-600 hover:text-emerald-400 opacity-0 group-hover/item:opacity-100">
                                                    <Copy className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                        {lead.website && (
                                            <div className="flex items-center justify-between text-xs group/item">
                                                <div className="flex items-center text-slate-400">
                                                    <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                                    <span className="truncate max-w-[200px]">{lead.website}</span>
                                                </div>
                                                <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-emerald-400 opacity-0 group-hover/item:opacity-100">
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        )}
                                        {lead.address && (
                                            <div className="flex items-start text-xs text-slate-400">
                                                <MapPin className="w-3.5 h-3.5 mr-2 mt-0.5 flex-shrink-0" />
                                                <span className="leading-relaxed">{lead.address}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 group/notes">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Contact Notes</p>
                                    {editingId !== lead.id && (
                                        <button
                                            onClick={() => handleStartEdit(lead)}
                                            className="text-slate-600 hover:text-emerald-400 opacity-0 group-hover/notes:opacity-100 transition-opacity"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                {editingId === lead.id ? (
                                    <textarea
                                        value={editValues.notes || ""}
                                        onChange={(e) => handleFieldChange("notes", e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none min-h-[80px] resize-y"
                                        placeholder="Add keywords, project details, or site summaries..."
                                    />
                                ) : (
                                    <p className="text-xs text-slate-300 italic">
                                        {lead.notes ? `"${lead.notes}"` : <span className="text-slate-600">No notes added. Click edit to add keywords or summaries.</span>}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
