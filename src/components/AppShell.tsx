// ============================================
// MitrAI - App Shell (Conditional navigation wrapper)
// Handles TopBar, BottomTabs, and footer based on auth & route
// ============================================

'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import TopBar from './TopBar';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Determine page type
  const isAuthPage = pathname === '/login' || pathname.startsWith('/reset-password');
  const isAdminPage = pathname.startsWith('/admin');

  // Show full app shell (TopBar + BottomTabs) for logged-in users on app pages
  const showAppShell = !!user && !isAuthPage && !isAdminPage;

  // ---- Logged-in app pages ----
  if (showAppShell) {
    return (
      <>
        <TopBar />
        <main className="pt-16 pb-4 min-h-screen">
          {children}
        </main>
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
      <main className="min-h-screen">
        {children}
      </main>
    );
  }

  // ---- Landing page & static pages ----
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="MitrAI" className="h-8 w-auto" />
            <span className="text-sm font-semibold text-[var(--foreground)]">MitrAI</span>
            <span className="text-[10px] text-[var(--muted)] hidden sm:inline">SVNIT</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link href="/login" className="btn-primary text-xs py-1.5 px-4">
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main className="pt-14 min-h-screen">
        {children}
      </main>
      <footer className="border-t border-[var(--border)] py-4 px-4 text-center text-[10px] text-[var(--muted)] space-x-4">
        <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms of Service</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy Policy</Link>
        <span>·</span>
        <span>© {new Date().getFullYear()} MitrAI — SVNIT</span>
      </footer>
    </>
  );
}
