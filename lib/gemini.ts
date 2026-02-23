import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { CardData } from "./types";

const getGenAI = (apiKey?: string) => {
    const key = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!key) {
        throw new Error("Missing Gemini API Key. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.");
    }
    return new GoogleGenerativeAI(key);
};

export async function detectSteadyCard(
    imageBase64: string,
    apiKey?: string
): Promise<{ is_steady: boolean; card_present: boolean }> {
    try {
        const genAI = getGenAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const prompt = `Can you see a business card in this image? It might be held in a hand or slightly angled. If the core details (name, email, phone) appear reasonably legible, return true. 
        It does not need to be perfectly still or perfectly flat.
        Return JSON: { "is_steady": boolean (true if legible), "card_present": boolean (true if card is in frame) }`;

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { data: imageBase64.split(",")[1] || imageBase64, mimeType: "image/jpeg" } }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        is_steady: { type: SchemaType.BOOLEAN },
                        card_present: { type: SchemaType.BOOLEAN },
                    },
                    required: ["is_steady", "card_present"],
                },
                temperature: 0.1,
            },
        });

        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(text);
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
        const genAI = getGenAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            systemInstruction: `You are a professional business card scanner. 
Your goal is to extract contact information with 100% accuracy.
If a field is not present, return an empty string.
For 'notes', provide a brief semantic summary of the person/brand based on the card's design or tagline.`
        });

        const prompt = `Extract standard contact fields from this business card. Include coordinates for the Logo bounding box [ymin, xmin, ymax, xmax] normalized to 1000 so the frontend can crop the image.`;

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { data: imageBase64.split(",")[1] || imageBase64, mimeType: "image/jpeg" } }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        firstName: { type: SchemaType.STRING },
                        lastName: { type: SchemaType.STRING },
                        jobTitle: { type: SchemaType.STRING },
                        company: { type: SchemaType.STRING },
                        email: { type: SchemaType.STRING },
                        phone: { type: SchemaType.STRING },
                        website: { type: SchemaType.STRING },
                        address: { type: SchemaType.STRING },
                        notes: { type: SchemaType.STRING },
                        logo_box: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.INTEGER },
                            description: "Bounding box [ymin, xmin, ymax, xmax] of the main company logo or main artwork design, mapped to 0-1000."
                        },
                        card_box: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.INTEGER },
                            description: "Bounding box [ymin, xmin, ymax, xmax] of the full card area."
                        },
                    },
                    required: ["firstName", "lastName", "company", "phone", "email", "jobTitle", "notes", "website", "address"]
                },
                temperature: 0.1,
            },
        });

        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(text);
    } catch (e: any) {
        console.error("Gemini Extraction Error Details:", e);
        throw new Error(e.message || "Failed to process card through Gemini AI.");
    }
}

export async function enrichWithBackImage(
    existingData: CardData,
    backImageBase64: string,
    apiKey?: string
): Promise<CardData> {
    try {
        const genAI = getGenAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            systemInstruction: `You are enriching an existing business card profile with details from the back of the card.
DO NOT overwrite the front notes, combine them.`
        });

        const prompt = `Here is the back side of the business card. Existing data: ${JSON.stringify(existingData)}. 
        Extract any additional useful info (like secondary phone, specializations) and append it to the 'notes' field.
        Return ONLY the updated JSON.`;

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [
                    { text: prompt },
                    { inlineData: { data: backImageBase64.split(",")[1] || backImageBase64, mimeType: "image/jpeg" } }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        notes: { type: SchemaType.STRING },
                    },
                    required: ["notes"]
                },
                temperature: 0.1,
            },
        });

        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const newData = JSON.parse(text);

        return {
            ...existingData,
            notes: newData.notes || existingData.notes
        };
    } catch (e: any) {
        console.error("Gemini Enrichment Error Details:", e);
        return existingData; // Fallback gracefully
    }
}
