import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `You are enriching an existing business card profile with details from the back of the card.
DO NOT overwrite the front notes, combine them.`;

export async function POST(req: Request) {
    try {
        const { existingData, backImageBase64 } = await req.json();

        if (!backImageBase64) {
            return NextResponse.json({ error: 'Image data missing' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: SYSTEM_INSTRUCTION
        });

        const prompt = `Here is the back side of the business card. Existing data: ${JSON.stringify(existingData)}. 
        Extract any additional useful info (like secondary phone, specializations) and append it to the 'notes' field.
        Return ONLY the updated JSON.`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: backImageBase64.split(",")[1] || backImageBase64, mimeType: "image/jpeg" } }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        notes: { type: SchemaType.STRING },
                    },
                    required: ["notes"],
                },
                temperature: 0.1,
            },
        });

        const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const newData = JSON.parse(text);

        return NextResponse.json({
            ...existingData,
            notes: newData.notes || existingData.notes
        });

    } catch (error: any) {
        console.error("Gemini Enrichment Error:", error);
        return NextResponse.json({ error: 'Failed to enrich card' }, { status: 500 });
    }
}
