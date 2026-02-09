import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = { className: "font-sans" };

export const metadata: Metadata = {
    title: "Cardflo",
    description: "AI-Powered Business Card Scanner",
    manifest: "/manifest.json",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
