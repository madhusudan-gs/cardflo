import { GoogleGenerativeAI } from "@google/generative-ai";
import { CardData } from "./types";

export async function extractCardData(
    imageBase64: string,
    apiKey: string
): Promise<CardData> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Extract business card information from this image into a JSON object.
    Fields: firstName, lastName, jobTitle, company, email, phone, website, address, notes.
    For 'notes', provide a brief semantic summary of the person/brand based on the card's design or tagline.
    Format phone numbers with spaces for readability.
    Ensure strict JSON output.
  `;

    // Note: actual implementation would handle the image part object construction
    // This is a simplified placeholder for the logic
    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: imageBase64.split(",")[1],
                mimeType: "image/jpeg",
            },
        },
    ]);

    const response = await result.response;
    const text = response.text();

    // Basic cleaning of markdown code blocks often returned by LLMs
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(jsonStr) as CardData;
    } catch (e) {
        console.error("Failed to parse Gemini response", e);
        throw new Error("Could not extract data from image");
    }
}
