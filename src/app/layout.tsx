import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AppProviders from "@/components/AppProviders";
import { AuthProvider } from "@/lib/auth";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MitrAI — SVNIT Study Buddy Matching",
  description: "AI-powered study partner matching for SVNIT Surat students. Find compatible buddies across departments, subjects, and schedules.",
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
        <AuthProvider>
          <AppProviders>
            <Navbar />
            <main className="pt-14 min-h-screen">
              {children}
            </main>
          </AppProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
