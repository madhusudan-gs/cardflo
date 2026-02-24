import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
    try {
        const supabase = createClient();
        let sessionValid = false;

        // First try to authenticate via the Authorization header (passed by fetch)
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) sessionValid = true;
        }

        // Fallback to cookie-based session checking
        if (!sessionValid) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) sessionValid = true;
        }

        if (!sessionValid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json({ error: 'Image data missing' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `Can you see a business card in this image? It might be held in a hand or slightly angled. If the core details (name, email, phone) appear reasonably legible, return true. 
        It does not need to be perfectly still or perfectly flat.
        Return JSON: { "is_steady": boolean (true if legible), "card_present": boolean (true if card is in frame) }`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: imageBase64.split(",")[1] || imageBase64, mimeType: "image/jpeg" } }] }],
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
        return NextResponse.json(JSON.parse(text));

    } catch (error: any) {
        console.error("Gemini Detection API Error:", error);
        return NextResponse.json({ error: 'Failed to process card' }, { status: 500 });
    }
}
