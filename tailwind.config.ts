import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#020617", // Slate 950
                foreground: "#f8fafc", // Slate 50
                primary: {
                    DEFAULT: "#10b981", // Emerald 500
                    foreground: "#020617",
                },
                card: {
                    DEFAULT: "rgba(15, 23, 42, 0.6)", // Slate 900 / 60%
                    foreground: "#f8fafc",
                },
                muted: {
                    DEFAULT: "#1e293b", // Slate 800
                    foreground: "#94a3b8", // Slate 400
                },
                border: "#1e293b", // Slate 800
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
export default config;
