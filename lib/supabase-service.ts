
import { supabase } from './supabase'
import { CardData, Lead } from './types'
import { canScan } from './paywall-service'

// --- Duplicate Detection Utilities ---

const norm = (s: string | undefined | null) =>
    (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, '');

function leadsMatch(a: Lead, b: Lead): boolean {
    // Email match
    const aEmail = (a.email || "").trim().toLowerCase();
    const bEmail = (b.email || "").trim().toLowerCase();
    if (aEmail && bEmail && aEmail === bEmail) return true;

    // Phone match (digit only, ≥7 digits overlap)
    const aPhone = (a.phone || "").replace(/\D/g, '');
    const bPhone = (b.phone || "").replace(/\D/g, '');
    if (aPhone.length >= 7 && bPhone.length >= 7 &&
        (aPhone.includes(bPhone) || bPhone.includes(aPhone))) return true;

    // Name + company match
    const aFirst = norm(a.first_name); const aLast = norm(a.last_name);
    const bFirst = norm(b.first_name); const bLast = norm(b.last_name);
    if (aFirst && aLast && bFirst && bLast) {
        const nameFull = (f: string, l: string) => f + l;
        const nameMatch =
            (aFirst === bFirst && aLast === bLast) ||
            (aFirst === bLast && aLast === bFirst) ||
            (nameFull(aFirst, aLast) === nameFull(bFirst, bLast) && nameFull(aFirst, aLast).length > 5);
        if (nameMatch) {
            const aC = norm(a.company); const bC = norm(b.company);
            if (!aC || !bC || aC.includes(bC) || bC.includes(aC)) return true;
        }
    }
    return false;
}

export async function saveCard(card: CardData, userId: string): Promise<boolean> {
    try {
        // Safety check: ensure user hasn't bypassed UI limits
        const { allowed, reason } = await canScan(userId);
        if (!allowed) {
            console.error('Usage limit reached or error in canScan:', reason);
            throw new Error(reason === 'limit_reached' ? 'Scan limit reached. Please upgrade your plan.' : 'Unauthorized scan attempt.');
        }

        const { error } = await supabase
            .from('leads')
            .insert({
                created_by: userId,
                first_name: card.firstName?.trim(),
                last_name: card.lastName?.trim(),
                job_title: card.jobTitle?.trim(),
                company: card.company?.trim(),
                email: card.email?.trim(),
                phone: card.phone?.trim(),
                website: card.website?.trim(),
                address: card.address?.trim(),
                notes: card.notes?.trim(),
                image_url: card.imageUrl,
                back_image_url: card.backImage,
                scanned_at: card.scannedAt || new Date().toISOString(),
            })

        if (error) {
            console.error('Supabase saveCard error:', error)
            throw error
        }

        return true
    } catch (error) {
        console.error('Error in saveCard:', error);
        throw error;
    }
}
export async function getStats(userId: string): Promise<{ today: number, total: number }> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: total, error: totalError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId);

        const { count: todayCount, error: todayError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', userId)
            .gte('created_at', today.toISOString());

        if (totalError || todayError) {
            console.error('Supabase stats error:', totalError || todayError);
            return { today: 0, total: 0 };
        }

        return {
            today: todayCount || 0,
            total: total || 0
        };
    } catch (error) {
        console.error('Error fetching stats:', error);
        return { today: 0, total: 0 };
    }
}

export async function saveDraft(card: CardData, userId: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('drafts')
            .insert({
                created_by: userId,
                first_name: card.firstName?.trim(),
                last_name: card.lastName?.trim(),
                job_title: card.jobTitle?.trim(),
                company: card.company?.trim(),
                email: card.email?.trim(),
                phone: card.phone?.trim(),
                website: card.website?.trim(),
                address: card.address?.trim(),
                notes: card.notes?.trim(),
                back_image_url: card.backImage,
                scanned_at: card.scannedAt || new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error || !data) {
            console.error('Supabase draft error:', error);
            return null;
        }

        return (data as any).id;
    } catch (error) {
        console.error('Error saving draft:', error);
        return null;
    }
}

export async function deleteDraft(draftId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('drafts')
            .delete()
            .eq('id', draftId);

        if (error) {
            console.error('Supabase delete draft error:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting draft:', error);
        return false;
    }
}

export async function checkDuplicateLead(
    email: string | undefined,
    firstName: string,
    lastName: string,
    userId: string,
    phone?: string,
    company?: string
): Promise<boolean> {
    try {
        const targetEmail = (email || "").trim().toLowerCase();
        console.log("[DUPE CHECK] Starting check. Primary Key (Email):", targetEmail || "MISSING");

        // 1. PRIMARY CHECK: Direct Database Query by Email (Case-Insensitive)
        // This is extremely reliable and efficient for the 'Email as Primary Key' requirement
        if (targetEmail && targetEmail.includes('@')) {
            const { data: emailData, error: emailError } = await supabase
                .from('leads')
                .select('id, email')
                .eq('created_by', userId)
                .ilike('email', targetEmail);

            if (emailError) {
                console.error("[DUPE CHECK] Error querying by email:", emailError);
            } else if (emailData && emailData.length > 0) {
                console.log("[DUPE CHECK] Found exact email match in database:", emailData[0]);
                return true;
            }
        }

        // 2. SECONDARY CHECK: Fetch leads for flexible matching (Phone/Name)
        // Fetches a snapshot of leads to check for duplicates that might not have matching emails
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('created_by', userId)
            .limit(1000);

        if (error) {
            console.error("[DUPE CHECK] Error fetching secondary leads:", error);
            return false;
        }

        if (!data || data.length === 0) {
            console.log("[DUPE CHECK] No existing leads to compare against.");
            return false;
        }

        const targetPhone = (phone || "").replace(/\D/g, '');
        const norm = (s: string | undefined) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetFirst = norm(firstName);
        const targetLast = norm(lastName);
        const targetFull = targetFirst + targetLast;
        const targetCompany = norm(company);

        console.log(`[DUPE CHECK] Scanning ${data.length} records for Name/Phone matches...`);

        for (const lead of (data as any[])) {
            // Re-check email just in case Step 1 had a weird formatting issue
            if (targetEmail && (lead.email || "").trim().toLowerCase() === targetEmail) return true;

            // CRITERIA: Phone (Digit match)
            if (targetPhone && targetPhone.length >= 7) {
                const existingPhone = (lead.phone || "").replace(/\D/g, '');
                if (existingPhone.length >= 7 && (existingPhone.includes(targetPhone) || targetPhone.includes(existingPhone))) {
                    console.log("[DUPE CHECK] Phone match found:", existingPhone);
                    return true;
                }
            }

            // CRITERIA: Name Match (First + Last, handles swaps)
            if (targetFirst && targetLast) {
                const exFirst = norm(lead.first_name);
                const exLast = norm(lead.last_name);
                const exFull = exFirst + exLast;

                const nameMatch = (exFirst === targetFirst && exLast === targetLast) ||
                    (exFirst === targetLast && exLast === targetFirst) ||
                    (exFull === targetFull && targetFull.length > 5);

                if (nameMatch) {
                    const exCompany = norm(lead.company);
                    // Match if names match AND (no companies involved OR companies match)
                    if (!targetCompany || !exCompany || exCompany.includes(targetCompany) || targetCompany.includes(exCompany)) {
                        console.log("[DUPE CHECK] Name match found:", { exFirst, exLast, exCompany });
                        return true;
                    }
                }
            }
        }

        console.log("[DUPE CHECK] No duplicate found.");
        return false;
    } catch (error) {
        console.error('Critical failure in checkDuplicateLead:', error);
        return false;
    }
}

/**
 * Returns the first existing lead that matches the given card data, or null.
 * Replaces the boolean checkDuplicateLead for richer UI display.
 */
export async function getDuplicateMatch(
    email: string | undefined,
    firstName: string,
    lastName: string,
    userId: string,
    phone?: string,
    company?: string
): Promise<Lead | null> {
    try {
        const targetEmail = (email || "").trim().toLowerCase();

        // Step 1: fast email lookup
        if (targetEmail && targetEmail.includes('@')) {
            const { data: emailData } = await supabase
                .from('leads')
                .select('*')
                .eq('created_by', userId)
                .ilike('email', targetEmail)
                .limit(1)
                .single();
            if (emailData) return emailData as Lead;
        }

        // Step 2: load all leads for phone/name matching
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('created_by', userId)
            .limit(1000);

        if (error || !data || data.length === 0) return null;

        const candidate: Lead = {
            id: '', created_by: userId,
            first_name: firstName, last_name: lastName,
            email: email || null, phone: phone || null,
            company: company || null,
            job_title: null, website: null, address: null, notes: null,
            image_url: null, back_image_url: null,
            created_at: '', scanned_at: null,
        };

        for (const lead of data as Lead[]) {
            if (leadsMatch(candidate, lead)) return lead;
        }

        return null;
    } catch (err) {
        console.error('[getDuplicateMatch] error:', err);
        return null;
    }
}

export interface DuplicatePair {
    lead: Lead;
    matchedWith: Lead;
}

/**
 * Scans all leads for a user and returns every pair of duplicates found.
 * Each pair is returned only once (a→b, not also b→a).
 */
export async function findAllDuplicates(userId: string): Promise<DuplicatePair[]> {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('created_by', userId)
            .order('created_at', { ascending: true });

        if (error || !data || data.length < 2) return [];

        const leads = data as Lead[];
        const pairs: DuplicatePair[] = [];
        const seen = new Set<string>(); // prevent a→b AND b→a

        for (let i = 0; i < leads.length; i++) {
            for (let j = i + 1; j < leads.length; j++) {
                const key = `${leads[i].id}::${leads[j].id}`;
                if (seen.has(key)) continue;
                if (leadsMatch(leads[i], leads[j])) {
                    pairs.push({ lead: leads[j], matchedWith: leads[i] }); // newer first
                    seen.add(key);
                }
            }
        }

        return pairs;
    } catch (err) {
        console.error('[findAllDuplicates] error:', err);
        return [];
    }
}

export async function updateLead(leadId: string, leadData: Partial<Lead>): Promise<boolean> {
    try {
        // Sanitize data: remove non-updatable fields
        const { id, created_at, created_by, ...editableData } = leadData;

        console.log(`[UPDATE LEAD] Attempting update for ID: ${leadId}`, editableData);

        const { error } = await supabase
            .from('leads')
            .update(editableData)
            .eq('id', leadId);

        if (error) {
            console.error('Supabase updateLead error:', error.message, error.details, error.hint);
            return false;
        }

        console.log(`[UPDATE LEAD] Successfully updated ID: ${leadId}`);
        return true;
    } catch (error) {
        console.error('Error in updateLead:', error);
        return false;
    }
}

