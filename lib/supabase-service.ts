
import { supabase } from './supabase'
import { CardData, Lead } from './types'
import { canScan } from './paywall-service'

export async function saveCard(card: CardData, userId: string): Promise<boolean> {
    try {
        // Safety check: ensure user hasn't bypassed UI limits
        const { allowed, reason } = await canScan(userId);
        if (!allowed) {
            console.error('Usage limit reached or error in canScan:', reason);
            throw new Error(reason === 'limit_reached' ? 'Scan limit reached. Please upgrade your plan.' : 'Unauthorized scan attempt.');
        }

        const { error } = await (supabase
            .from('leads') as any)
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
            } as any)

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
        const { data, error } = await (supabase
            .from('drafts') as any)
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
            } as any)
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
        const { error } = await (supabase
            .from('drafts') as any)
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

export async function updateLead(leadId: string, leadData: Partial<Lead>): Promise<boolean> {
    try {
        // Sanitize data: remove non-updatable fields
        const { id, created_at, created_by, ...editableData } = leadData as any;

        console.log(`[UPDATE LEAD] Attempting update for ID: ${leadId}`, editableData);

        const { error } = await (supabase
            .from('leads') as any)
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

// Utility for logging
function digitOnly(s: string): string {
    return (s || "").replace(/\D/g, '');
}
