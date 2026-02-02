"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/shared";
import { ChevronLeft, Trash2, Copy, Search, ExternalLink, Mail, Phone, MapPin } from "lucide-react";

interface Lead {
    id: string;
    first_name: string;
    last_name: string;
    company: string;
    email: string;
    phone: string;
    job_title: string;
    website: string;
    address: string;
    notes: string;
    created_at: string;
}

export function LeadsScreen({ onBack }: { onBack: () => void }) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

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

        const { error } = await supabase
            .from('leads')
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
        `${l.first_name} ${l.last_name} ${l.company} ${l.email}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
            <header className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
                <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-400">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h2 className="text-xl font-bold text-white">My Captured Leads</h2>
                </div>
                <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 uppercase">
                    {leads.length} Total
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
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight">
                                        {lead.first_name} {lead.last_name}
                                    </h3>
                                    <p className="text-emerald-400 text-sm font-medium">{lead.job_title}</p>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-tight mt-1">{lead.company}</p>
                                </div>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => deleteLead(lead.id)} className="w-8 h-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 border-t border-slate-800/50 pt-4">
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
                            </div>

                            {lead.notes && (
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">AI Summary</p>
                                    <p className="text-xs text-slate-300 italic">"{lead.notes}"</p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
