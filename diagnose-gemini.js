
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const fs = require("fs");

async function diagnose() {
    const envPath = path.join(__dirname, ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const apiKey = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/)?.[1]?.trim();

    if (!apiKey) {
        console.error("No API key found in .env.local");
        return;
    }

    console.log("Using API Key:", apiKey.substring(0, 5) + "...");
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // We can't easily list models with the SDK, but we can try a few common ones
        const models = [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-3-flash-preview",
            "gemini-3-pro-preview",
            "gemini-2.0-flash",
            "gemini-flash-latest"
        ];

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("test");
                console.log(`✅ Model ${modelName} is AVAILABLE`);
            } catch (e) {
                console.log(`❌ Model ${modelName} returned error:`, e.reason || e.message);
            }
        }
    } catch (err) {
        console.error("Global Error:", err);
    }
}

diagnose();
