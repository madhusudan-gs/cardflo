import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createClient } from '@/lib/supabase-server';

const SYSTEM_INSTRUCTION = `You are a professional business card scanner. 
Your goal is to extract contact information with 100% accuracy.
If a field is not present, return an empty string.
For 'notes', provide a brief semantic summary of the person/brand based on the card's design or tagline.

CRITICAL FORMATTING RULES:
1. PHONE: ONLY extract the primary mobile phone number into the 'phone' field. If there are multiple numbers (e.g., landline, fax, office), put the extra numbers in the 'notes' field, NOT the 'phone' field.
2. PHONE FORMAT: Always format the primary mobile number without spaces or dashes, exactly like +919000000000 so it works with WhatsApp links.
3. NAMES: Do not include titles (Mr., Dr.) or credentials (Ph.D., B.Tech) in the firstName or lastName fields. Put credentials in the 'notes' field instead.`;

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
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            systemInstruction: SYSTEM_INSTRUCTION
        });

        const prompt = `Extract standard contact fields from this business card. Include coordinates for the Logo bounding box [ymin, xmin, ymax, xmax] normalized to 1000 so the frontend can crop the image.`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: imageBase64.split(",")[1] || imageBase64, mimeType: "image/jpeg" } }] }],
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
                        phone: {
                            type: SchemaType.STRING,
                            description: "STRICT RULE: ONLY extract the single primary mobile number. Format MUST be exactly like +919000000000 with NO spaces, dashes, or commas. If there are multiple numbers, IGNORE the rest here."
                        },
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
        return NextResponse.json(JSON.parse(text));

    } catch (error: any) {
        console.error("Gemini Extraction Error:", error);
        return NextResponse.json({ error: 'Failed to process card' }, { status: 500 });
    }
}
