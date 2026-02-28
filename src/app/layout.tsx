import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import { AuthProvider } from "@/lib/auth";
import ThemeProvider from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "700"],
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
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
            <AppProviders>
              <AppShell>
                {children}
              </AppShell>
            </AppProviders>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
