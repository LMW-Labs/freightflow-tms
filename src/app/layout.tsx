import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VectrLoadAI - Intelligent Freight Management",
    template: "%s | VectrLoadAI",
  },
  description: "AI-powered transportation management system for freight brokers. Manage loads, track shipments in real-time, optimize margins with intelligent insights, and give your customers visibility with auto-generated portals.",
  keywords: [
    "TMS",
    "transportation management system",
    "freight broker software",
    "load tracking",
    "GPS tracking",
    "freight management",
    "logistics software",
    "shipment tracking",
    "carrier management",
    "AI logistics",
    "VectrLoadAI",
    "intelligent freight",
  ],
  authors: [{ name: "VectrLoadAI" }],
  creator: "VectrLoadAI",
  publisher: "VectrLoadAI",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "VectrLoadAI",
    title: "VectrLoadAI - Intelligent Freight Management",
    description: "AI-powered transportation management system for freight brokers. Real-time GPS tracking, customer portals, intelligent margin optimization, and complete load management.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "VectrLoadAI Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VectrLoadAI - Intelligent Freight Management",
    description: "AI-powered transportation management system for freight brokers.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
