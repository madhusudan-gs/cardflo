
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
