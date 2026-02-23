import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyDOt9-k7hakCmUl9O_xxxeX5Bj8paIn2lA";
const genAI = new GoogleGenerativeAI(apiKey);

async function check() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log("AVAILABLE MODELS:");
        data.models.forEach((m: any) => {
            console.log(`- ${m.name}`);
        });
    } catch (e) {
        console.error(e);
    }
}
check();
