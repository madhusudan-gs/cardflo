
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
                    is_admin: boolean | null
                    custom_scan_limit: number | null
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
                    is_admin?: boolean | null
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
                    is_admin?: boolean | null
                }
                Relationships: []
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
                    back_image_url: string | null
                    scanned_at: string | null
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
                    back_image_url?: string | null
                    scanned_at?: string | null
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
                    back_image_url?: string | null
                    scanned_at?: string | null
                }
                Relationships: []
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
                Relationships: []
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
                Relationships: []
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
                Relationships: []
            }
            drafts: {
                Row: {
                    id: string
                    created_at: string
                    created_by: string
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
                    back_image_url: string | null
                    scanned_at: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    created_by: string
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
                    back_image_url?: string | null
                    scanned_at?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    created_by?: string
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
                    back_image_url?: string | null
                    scanned_at?: string | null
                }
                Relationships: []
            }
            coupons: {
                Row: {
                    id: string
                    code: string
                    bonus_scans: number
                    max_uses: number
                    current_uses: number
                    created_at: string
                    duration_months: number
                }
                Insert: {
                    id?: string
                    code: string
                    bonus_scans: number
                    max_uses: number
                    current_uses?: number
                    created_at?: string
                    duration_months?: number
                }
                Update: {
                    id?: string
                    code?: string
                    bonus_scans?: number
                    max_uses?: number
                    current_uses?: number
                    created_at?: string
                    duration_months?: number
                }
                Relationships: []
            }
            app_settings: {
                Row: {
                    key: string
                    value: Json
                    updated_at: string | null
                    updated_by: string | null
                }
                Insert: {
                    key: string
                    value: Json
                    updated_at?: string | null
                    updated_by?: string | null
                }
                Update: {
                    key?: string
                    value?: Json
                    updated_at?: string | null
                    updated_by?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            redeem_coupon: {
                Args: {
                    coupon_code: string
                    target_user_id: string
                }
                Returns: Json
            }
            get_global_stats: {
                Args: Record<string, never>
                Returns: Json
            }
            check_rate_limit: {
                Args: {
                    check_user_id: string
                }
                Returns: boolean
            }
            get_admin_summary: {
                Args: Record<string, never>
                Returns: {
                    totalUsers: number
                    totalLeads: number
                    activeSubscriptions: number
                    planBreakdown: Record<string, number>
                    estimatedMRR: number
                    recentUsers: Json[]
                    recentLeads: Json[]
                }
            }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
