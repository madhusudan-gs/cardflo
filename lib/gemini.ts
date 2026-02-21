import { CardData } from "./types";

export async function detectSteadyCard(
    imageBase64: string,
    apiKey?: string // Kept for backwards compatibility 
): Promise<{ is_steady: boolean; card_present: boolean }> {
    try {
        const res = await fetch('/api/extract/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64 })
        });
        if (!res.ok) throw new Error("Detection failed");
        return await res.json();
    } catch (e) {
        console.error("Gemini Detection Error:", e);
        return { is_steady: false, card_present: false };
    }
}

export async function extractCardData(
    imageBase64: string,
    apiKey?: string
): Promise<CardData> {
    try {
        const res = await fetch('/api/extract/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64 })
        });
        if (!res.ok) throw new Error("Extraction failed");
        return await res.json();
    } catch (e: any) {
        console.error("Gemini Extraction Error Details:", e);
        throw new Error(e.message || "Failed to process card through server infrastructure");
    }
}

export async function enrichWithBackImage(
    existingData: CardData,
    backImageBase64: string,
    apiKey?: string
): Promise<CardData> {
    try {
        const res = await fetch('/api/extract/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ existingData, backImageBase64 })
        });

        if (!res.ok) return existingData;
        const newData = await res.json();

        return {
            ...existingData,
            notes: newData.notes || existingData.notes
        };
    } catch (e: any) {
        console.error("Gemini Enrichment Error Details:", e);
        return existingData;
    }
}
