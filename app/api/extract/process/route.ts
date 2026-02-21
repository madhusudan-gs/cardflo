import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `You are a professional business card scanner. 
Your goal is to extract contact information with 100% accuracy.
If a field is not present, return an empty string.
For 'notes', provide a brief semantic summary of the person/brand based on the card's design or tagline.`;

export async function POST(req: Request) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json({ error: 'Image data missing' }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview",
            systemInstruction: SYSTEM_INSTRUCTION
        });

        const prompt = `Extract standard contact fields from this business card. Include coordinates for the Logo bounding box [ymin, xmin, ymax, xmax] normalized to 1000 so the frontend can crop the image.`;

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

        const response = await result.response;
        const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();

        return NextResponse.json(JSON.parse(text));

    } catch (error: any) {
        console.error("Gemini Extraction Error:", error);
        return NextResponse.json({ error: 'Failed to process card' }, { status: 500 });
    }
}
