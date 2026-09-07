import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
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
  metadataBase: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined,
  title: {
    default: "AquaTrace | Water Integrity Monitoring",
    template: "%s | AquaTrace",
  },
  description: "Evidence-led water pollution reporting, investigation, and accountable resolution workflows.",
  applicationName: "AquaTrace",
  keywords: ["water quality", "pollution reporting", "environmental monitoring", "incident management"],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AquaTrace",
    title: "AquaTrace | Water Integrity Monitoring",
    description: "Evidence-led water pollution reporting, investigation, and accountable resolution workflows.",
  },
  twitter: {
    card: "summary",
    title: "AquaTrace | Water Integrity Monitoring",
    description: "Evidence-led water pollution reporting, investigation, and accountable resolution workflows.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
