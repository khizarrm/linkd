import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono, DM_Serif_Display } from "next/font/google";
import { ConditionalLayout } from "@/components/conditional-layout";
import { PostHogPageview } from "@/components/posthog-provider";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  variable: "--font-dm-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LINKD",
  description: "Automate your outreach with AI-powered contact discovery and engagement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/login"
      signInFallbackRedirectUrl="/login"
      signUpFallbackRedirectUrl="/login"
    >
      <html lang="en" className="dark bg-[#0a0a0a]">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${dmSerif.variable} antialiased bg-[#0a0a0a] font-sans`}
        >
          <Suspense fallback={null}>
            <PostHogPageview />
          </Suspense>
          <ConditionalLayout>{children}</ConditionalLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
