// ============================================
// MitrAI - Top Bar (Minimal header for logged-in users)
// Shows logo, theme toggle, user name
// ============================================

'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';

export default function TopBar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
      <div className="flex items-center justify-between h-12 px-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2">
          <img src="/logo.jpg" alt="MitrAI" className="h-8 w-auto" />
          <span className="text-sm font-semibold text-[var(--foreground)]">MitrAI</span>
          <span className="text-[10px] text-[var(--muted)] hidden sm:inline">SVNIT</span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-sm"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user && (
            <span className="text-xs text-[var(--muted)] max-w-[100px] truncate hidden sm:inline">
              {user.name}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
