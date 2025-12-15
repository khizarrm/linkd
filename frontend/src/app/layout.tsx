import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from "next/font/google";
import { ConditionalLayout } from "@/components/conditional-layout";
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
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] font-sans`}
        >
          <ConditionalLayout>{children}</ConditionalLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
