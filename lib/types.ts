export type AppStatus =
    | "AUTHENTICATING"
    | "IDLE"
    | "SCANNING"
    | "EXTRACTING"
    | "REVIEWING"
    | "SAVING"
    | "SUCCESS"
    | "LEADS"
    | "PAYWALL"
    | "REFERRAL"
    | "ADMIN";

export interface CardData {
    firstName: string;
    lastName: string;
    jobTitle: string;
    company: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    notes: string;
    backImage?: string;
    imageUrl?: string;
    scannedAt?: string;
    isDuplicate?: boolean; // New flag for UI warning
    isPartial?: boolean;   // New flag for obscured info detection
    logo_box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
    logo_fallback_base64?: string; // Cropped image data string
}

export interface Lead {
    id: string;
    created_by: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    website: string | null;
    address: string | null;
    notes: string | null;
    image_url?: string | null;
    back_image_url?: string | null;
    logo_fallback_url?: string | null;
    created_at: string;
    scanned_at: string | null;
}
