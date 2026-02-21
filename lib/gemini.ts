import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { CardData } from "./types";

const SYSTEM_INSTRUCTION = `You are a professional business card scanner. 
Your goal is to extract contact information with 100% accuracy.
If a field is not present, return an empty string.
For 'notes', provide a brief semantic summary of the person/brand based on the card's design or tagline.`;

// Helper to strip markdown backticks from AI response
function cleanJSON(text: string): string {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export async function detectSteadyCard(
    imageBase64: string,
    apiKey: string
): Promise<{ is_steady: boolean; card_present: boolean }> {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Using 3-flash for ultra-fast detection (Feb 2026 standard)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `Business card in frame?
    Return JSON: { "is_steady": boolean (legible), "card_present": boolean }`;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: imageBase64.split(",")[1], mimeType: "image/jpeg" } }] }],
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

        const response = await result.response;
        const text = response.text();
        console.log("Gemini Detection Response:", text);
        return JSON.parse(cleanJSON(text));
    } catch (e) {
        console.error("Gemini Detection Error:", e);
        return { is_steady: false, card_present: false };
    }
}

export async function extractCardData(
    imageBase64: string,
    apiKey: string
): Promise<CardData> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-3-pro-preview", // Upgraded to Pro for 100% extraction accuracy
        systemInstruction: SYSTEM_INSTRUCTION
    });

    const prompt = `EXPERT DATA EXTRACTION: Read this business card and extract contact details into the provided schema.

    CRITICAL QUALITY CHECK: 
    - Determine if the card is OBSTRUCTED. Are there fingers, objects, heavy glare, or poor framing obscuring ANY part of the card text?
    - If obstructed, set "isPartial" to true.

    FORMATTING RULES:
    - PHONE: STRICTLY E.164 FORMAT (e.g., '+14155552671'). 
      - If country code is missing, YOU MUST DEDUCE IT from the address or email domain on the card.
      - Example: Address contains 'London, UK' -> Prefix +44. Address contains 'Bangalore, India' -> Prefix +91.
      - If invalid/ambiguous, return empty string. NO formatting chars allowed.
    - NOTES: Write a 1-sentence professional summary describing the person's role or company specialization.
    - EMPTY FIELDS: If a piece of info is not on the card, return an empty string. DO NOT HALLUCINATE.`;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: imageBase64.split(",")[1], mimeType: "image/jpeg" } }] }],
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
                        isPartial: { type: SchemaType.BOOLEAN, description: "Set true if fingers, objects, or glare obscure any text." },
                    },
                    required: ["firstName", "lastName", "company", "email", "isPartial"],
                },
            },
        });

        const response = await result.response;
        const text = response.text();
        console.log("Gemini Extraction Response:", text);
        return JSON.parse(cleanJSON(text)) as CardData;
    } catch (e: any) {
        console.error("Gemini Extraction Error Details:", e);
        // Pass more detail to the UI if possible
        throw new Error(e.message || "Formulation Failed: The AI could not reliably structure the card data.");
    }
}
