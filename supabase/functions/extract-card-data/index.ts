import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI, SchemaType } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, imageBase64, existingData, backImageBase64 } = await req.json()

    if (!action) {
      return new Response(JSON.stringify({ error: 'Missing action parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured in Supabase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)

    // --- ACTION: DETECT STEADY CARD ---
    if (action === 'detect') {
      const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })
      const prompt = `Can you see a business card in this image? It might be held in a hand or slightly angled. If the core details (name, email, phone) appear reasonably legible, return true. 
      It does not need to be perfectly still or perfectly flat.
      Return JSON: { "is_steady": boolean (true if legible), "card_present": boolean (true if card is in frame) }`

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
      })
      const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim()
      return new Response(text, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- ACTION: EXTRACT CARD DATA ---
    if (action === 'extract') {
      const SYSTEM_INSTRUCTION = `You are a professional business card scanner. 
      Your goal is to extract contact information with 100% accuracy.
      If a field is not present, return an empty string.
      For 'notes', provide a brief semantic summary of the person/brand based on the card's design or tagline.`

      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: SYSTEM_INSTRUCTION
      })

      const prompt = `Extract standard contact fields from this business card. Include coordinates for the Logo bounding box [ymin, xmin, ymax, xmax] normalized to 1000 so the frontend can crop the image.`

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
      })
      const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim()
      return new Response(text, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- ACTION: ENRICH WITH BACK IMAGE ---
    if (action === 'enrich') {
      const SYSTEM_INSTRUCTION = `You are enriching an existing business card profile with details from the back of the card.
      DO NOT overwrite the front notes, combine them.`

      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        systemInstruction: SYSTEM_INSTRUCTION
      })

      const prompt = `Here is the back side of the business card. Existing data: ${JSON.stringify(existingData)}. 
      Extract any additional useful info (like secondary phone, specializations) and append it to the 'notes' field.
      Return ONLY the updated JSON.`

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
      })
      const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim()
      const newData = JSON.parse(text)

      const mergedData = {
        ...existingData,
        notes: newData.notes || existingData.notes
      }
      return new Response(JSON.stringify(mergedData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error("Functions Edge Error:", err)
    return new Response(JSON.stringify({ error: err.message || 'Internal Edge Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
