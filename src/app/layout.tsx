import type { Metadata, Viewport } from "next";
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
    "Bouarour Ayoub (codeonym) — AI Software Engineer specializing in agentic AI systems, multi-agent architectures, and LLM-driven workflows. Enter the Gate: an explorable Solo Leveling world where every project is a shadow waiting to ARISE.",
};

export const viewport: Viewport = {
  themeColor: "#05040b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
