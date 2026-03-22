// ============================================
// MitrRAI - App Shell (Conditional navigation wrapper)
// Handles TopBar, BottomTabs, and footer based on auth & route
// ============================================

'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DesktopHeader, MobileNavbar } from './TopBar';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import GlobalNotificationPoller from './GlobalNotificationPoller';
import IncomingCallBanner from './IncomingCallBanner';
import { useTimeTracker } from '@/hooks/useTimeTracker';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Start background tracker
  useTimeTracker();

  // Determine page type
  const isAuthPage = pathname === '/login' || pathname.startsWith('/reset-password');
  const isAdminPage = pathname.startsWith('/admin');

  // Show full app shell (TopBar + BottomTabs) for logged-in users on app pages
  const showAppShell = !!user && !isAuthPage && !isAdminPage;

  // Pages that manage their own full-screen layout (chat pages)
  const isFullScreenPage =
    /^\/arya\/chat/.test(pathname) ||
    /^\/anon\/[^/]+/.test(pathname) ||
    /^\/chat/.test(pathname) ||
    /^\/call(\/|$)/.test(pathname) ||
    /^\/rooms/.test(pathname);

  // ---- Logged-in app pages ----
  if (showAppShell) {
    // Full-screen pages render without the shell wrapper (they handle their own layout)
    if (isFullScreenPage) {
      return (
        <>
          <GlobalNotificationPoller />
          <IncomingCallBanner />
          {children}
        </>
      );
    }

    // Normal pages: 100dvh flex column layout
    return (
      <>
        <GlobalNotificationPoller />
        <IncomingCallBanner />
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Desktop header at top */}
          <DesktopHeader />
          {/* Main scrollable area */}
          <main style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
            {children}
          </main>
          {/* Mobile navbar at bottom */}
          <MobileNavbar />
        </div>
      </>
    );
  }

  // ---- Admin pages ----
  if (isAdminPage) {
    return (
      <main className="min-h-screen">
        {children}
      </main>
    );
  }

  // ---- Auth pages (login, reset-password) ----
  if (isAuthPage) {
    return (
      <main style={{ height: '100dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>
    );
  }

  // ---- Landing page & static pages ----
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.jpg"
              alt="MitrRAI"
              width={36}
              height={36}
              className="h-9 w-auto rounded-xl shadow-lg group-hover:scale-105 transition-transform"
              priority
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[var(--foreground)] leading-none">MitrRAI</span>
              <span className="text-[11px] text-[var(--muted-strong)] leading-none mt-0.5 hidden sm:block">SVNIT Surat</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-200"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link href="/login" className="btn-primary text-xs py-2 px-5 font-semibold">
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main className="pt-14 min-h-screen">
        {children}
      </main>
      <footer className="border-t border-[var(--glass-border)] py-5 px-4 text-center text-[11px] text-[var(--muted-strong)] space-x-4">
        <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
        <span className="opacity-50">·</span>
        <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
        <span className="opacity-50">·</span>
        <span>© {new Date().getFullYear()} MitrRAI — SVNIT</span>
      </footer>
    </>
  );
}
