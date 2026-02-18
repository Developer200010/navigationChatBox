import type { Metadata } from "next";
import { Sora, Source_Serif_4, Space_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Nia Verma | Co-Browsing Portfolio",
  description:
    "A portfolio with an AI co-browsing assistant powered by Gemini tool calls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${sourceSerif.variable} ${spaceMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
