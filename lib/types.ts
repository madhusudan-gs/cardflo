export type AppStatus =
    | "AUTHENTICATING"
    | "IDLE"
    | "SCANNING"
    | "EXTRACTING"
    | "REVIEWING"
    | "DUPLICATE_FOUND"
    | "CHECKING"
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
}

export interface Lead {
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
    image_url?: string;
    back_image_url?: string;
    created_at: string;
    scanned_at: string;
}
