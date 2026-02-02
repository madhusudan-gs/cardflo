
import { supabase } from './supabase'
import { CardData } from './types'

export async function saveCard(card: CardData, userId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('leads')
            .insert({
                created_by: userId,
                first_name: card.firstName,
                last_name: card.lastName,
                job_title: card.jobTitle,
                company: card.company,
                email: card.email,
                phone: card.phone,
                website: card.website,
                address: card.address,
                notes: card.notes,
                // team_id: ... // Future: Add team logic here
            } as any)

        if (error) {
            console.error('Supabase error:', error)
            throw error
        }

        return true
    } catch (error) {
        console.error('Error saving card:', error)
        return false
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
                first_name: card.firstName,
                last_name: card.lastName,
                job_title: card.jobTitle,
                company: card.company,
                email: card.email,
                phone: card.phone,
                website: card.website,
                address: card.address,
                notes: card.notes,
            } as any)
            .select('id')
            .single();

        if (error) {
            console.error('Supabase draft error:', error);
            return null;
        }

        return data.id;
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
