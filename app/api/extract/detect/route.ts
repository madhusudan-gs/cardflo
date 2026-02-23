import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function POST(req: Request) {
    try {
        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json({ error: 'Image data missing' }, { status: 400 });
        }

        // Rely on server-side environment variable to hide key from client
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Can you see a business card in this image? It might be held in a hand or slightly angled. If the core details (name, email, phone) appear reasonably legible, return true. 
        It does not need to be perfectly still or perfectly flat.
        Return JSON: { "is_steady": boolean (true if legible), "card_present": boolean (true if card is in frame) }`;

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
        const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();

        console.log("Detection API Raw Response:", text); // <-- Debugging log added here

        return NextResponse.json(JSON.parse(text));

    } catch (error: any) {
        console.error("Gemini Detection Error:", error);
        return NextResponse.json({ error: 'Failed to process card' }, { status: 500 });
    }
}
