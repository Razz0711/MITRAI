import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import { AuthProvider } from "@/lib/auth";
import ThemeProvider from "@/components/ThemeProvider";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import ToastProvider from "@/components/ToastProvider";
import OnboardingWalkthrough from "@/components/OnboardingWalkthrough";
import SplashScreen from "@/components/SplashScreen";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a12',
};

export const metadata: Metadata = {
  title: "MitrrAi — Campus Companion",
  description: "AI-powered campus companion for Indian college students. Find study buddies, chat with Arya AI, and connect across departments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* visualViewport --vh variable for mobile keyboard */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            function setVh(){
              var vh=(window.visualViewport?window.visualViewport.height:window.innerHeight)*0.01;
              document.documentElement.style.setProperty('--vh',vh+'px');
            }
            setVh();
            if(window.visualViewport){
              window.visualViewport.addEventListener('resize',setVh);
              window.visualViewport.addEventListener('scroll',setVh);
            }
            window.addEventListener('resize',setVh);
            window.addEventListener('orientationchange',setVh);
          })();
        `}} />
      </head>
      <body
        className={`${plusJakarta.variable} ${outfit.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <AppProviders>
                <AppShell>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                  <OnboardingWalkthrough />
                  <SplashScreen />
                </AppShell>
              </AppProviders>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
