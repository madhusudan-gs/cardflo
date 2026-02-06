
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
                    subscription_tier: 'starter' | 'lite' | 'standard' | 'pro' | 'team' | null
                    subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none' | null
                    billing_cycle_end: string | null
                    stripe_customer_id: string | null
                    stripe_subscription_id: string | null
                    razorpay_customer_id: string | null
                    razorpay_subscription_id: string | null
                    referral_code: string | null
                    team_id: string | null
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    updated_at?: string | null
                    subscription_tier?: 'starter' | 'lite' | 'standard' | 'pro' | 'team' | null
                    subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none' | null
                    billing_cycle_end?: string | null
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    razorpay_customer_id?: string | null
                    razorpay_subscription_id?: string | null
                    referral_code?: string | null
                    team_id?: string | null
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    updated_at?: string | null
                    subscription_tier?: 'starter' | 'lite' | 'standard' | 'pro' | 'team' | null
                    subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none' | null
                    billing_cycle_end?: string | null
                    stripe_customer_id?: string | null
                    stripe_subscription_id?: string | null
                    razorpay_customer_id?: string | null
                    razorpay_subscription_id?: string | null
                    referral_code?: string | null
                    team_id?: string | null
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
            usage: {
                Row: {
                    id: string
                    user_id: string
                    cycle_start: string | null
                    cycle_end: string | null
                    scans_count: number | null
                    bonus_scans_remaining: number | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    cycle_start?: string | null
                    cycle_end?: string | null
                    scans_count?: number | null
                    bonus_scans_remaining?: number | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    cycle_start?: string | null
                    cycle_end?: string | null
                    scans_count?: number | null
                    bonus_scans_remaining?: number | null
                    created_at?: string | null
                }
            }
        }
    }
}
