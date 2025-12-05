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
    default: "FreightFlow - A KHCL TMS",
    template: "%s | FreightFlow",
  },
  description: "Modern transportation management system for freight brokers. Manage loads, track shipments in real-time, and give your customers visibility with auto-generated portals.",
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
    "KHCL",
    "FreightFlow",
  ],
  authors: [{ name: "KHCL" }],
  creator: "KHCL",
  publisher: "KHCL",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "FreightFlow",
    title: "FreightFlow - A KHCL TMS",
    description: "Modern transportation management system for freight brokers. Real-time GPS tracking, customer portals, and complete load management.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "FreightFlow Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FreightFlow - A KHCL TMS",
    description: "Modern transportation management system for freight brokers.",
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
