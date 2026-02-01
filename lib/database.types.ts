
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    avatar_url: string | null
                    updated_at: string | null
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    updated_at?: string | null
                }
            }
            leads: {
                Row: {
                    id: string
                    created_at: string
                    created_by: string
                    team_id: string | null
                    first_name: string | null
                    last_name: string | null
                    job_title: string | null
                    company: string | null
                    email: string | null
                    phone: string | null
                    website: string | null
                    address: string | null
                    notes: string | null
                    image_url: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    created_by: string
                    team_id?: string | null
                    first_name?: string | null
                    last_name?: string | null
                    job_title?: string | null
                    company?: string | null
                    email?: string | null
                    phone?: string | null
                    website?: string | null
                    address?: string | null
                    notes?: string | null
                    image_url?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    created_by?: string
                    team_id?: string | null
                    first_name?: string | null
                    last_name?: string | null
                    job_title?: string | null
                    company?: string | null
                    email?: string | null
                    phone?: string | null
                    website?: string | null
                    address?: string | null
                    notes?: string | null
                    image_url?: string | null
                }
            }
            teams: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                    owner_id: string
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string
                    owner_id: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                    owner_id?: string
                }
            }
            team_members: {
                Row: {
                    team_id: string
                    user_id: string
                    role: 'owner' | 'admin' | 'member'
                    joined_at: string
                }
                Insert: {
                    team_id: string
                    user_id: string
                    role?: 'owner' | 'admin' | 'member'
                    joined_at?: string
                }
                Update: {
                    team_id?: string
                    user_id?: string
                    role?: 'owner' | 'admin' | 'member'
                    joined_at?: string
                }
            }
        }
    }
}
