export type AppStatus =
    | "AUTHENTICATING"
    | "IDLE"
    | "SCANNING"
    | "EXTRACTING"
    | "REVIEWING"
    | "DUPLICATE_FOUND"
    | "SAVING"
    | "SUCCESS";

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
}

