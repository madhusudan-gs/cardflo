import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function POST(req: Request) {
    try {
        const { existingData, backImageBase64 } = await req.json();

        if (!backImageBase64) { return NextResponse.json({ error: 'Image data missing' }, { status: 400 }); }

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview",
            systemInstruction: `You are a professional business card AI assistant.
Your goal is to extract ALL relevant keywords, services, and extra context from the BACK side of a business card.
You will be given the data already extracted from the front side.
Return a JSON containing only the UPDATED 'notes' field.
In the 'notes' field, combine the existing notes with new keywords and summaries found on the back. Make it highly searchable and comprehensive.`
        });

        const prompt = `EXPERT DATA EXTRACTION: Read the BACK of this business card.
        
        Front Side Data Already Extracted:
        ${JSON.stringify(existingData, null, 2)}
        
        INSTRUCTIONS:
        - Carefully read all text, services, taglines, branch locations, and keywords from the back image.
        - Append this new information to the existing 'notes' field in a professional, concise format.
        - If the back is blank or contains no new useful info, return exactly the same 'notes' string.
        
        Return exactly this JSON schema: { "notes": string }`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: backImageBase64.split(",")[1], mimeType: "image/jpeg" } }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: { notes: { type: SchemaType.STRING }, },
                    required: ["notes"],
                },
            },
        });

        const response = await result.response;
        const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const newData = JSON.parse(text);

        return NextResponse.json({ notes: newData.notes || existingData.notes });

    } catch (error: any) {
        console.error("Gemini Enrichment Error:", error);
        return NextResponse.json({ error: 'Failed to enrich data' }, { status: 500 });
    }
}
