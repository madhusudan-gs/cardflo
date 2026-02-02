
const https = require('https');
const fs = require('fs');
const path = require('path');

async function listModels() {
    const envPath = path.join(__dirname, ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const apiKeyMatch = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
    if (!apiKeyMatch) {
        console.error("No API key found in .env.local");
        return;
    }
    const apiKey = apiKeyMatch[1].trim();
    console.log("Listing models for key starting with:", apiKey.substring(0, 5));

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.models) {
                    console.log("Available models:");
                    json.models.forEach(m => console.log(`- ${m.name}`));
                } else {
                    console.log("No models found or error response:", json);
                }
            } catch (e) {
                console.error("Error parsing response:", e.message);
                console.log("Raw response:", data);
            }
        });
    }).on('error', (err) => {
        console.error("Request error:", err.message);
    });
}

listModels();
