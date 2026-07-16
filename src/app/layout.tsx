import type { Metadata } from "next";
import { Geist_Mono, Rajdhani } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Eurostile-style display face for HUD headings (self-hosted)
const michroma = localFont({
  src: "../fonts/michroma-latin.woff2",
  variable: "--font-michroma",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CODEONYM — Agentic Systems Developer",
  description:
    "Bouarour Ayoub (codeonym) — AI Software Engineer specializing in agentic AI systems, multi-agent architectures, and LLM-driven workflows. Enter the System.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${rajdhani.variable} ${michroma.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col scanlines">{children}</body>
    </html>
  );
}
