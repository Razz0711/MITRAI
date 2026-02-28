// ============================================
// MitrAI - Navigation Bar (Cleaned Up)
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = user
    ? [
        { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
        { href: '/matches', label: 'Matches', icon: '🤝' },
        { href: '/friends', label: 'Friends', icon: '👥' },
        { href: '/chat', label: 'Chat', icon: '💬' },
        { href: '/rooms', label: 'Rooms', icon: '📚' },
        { href: '/doubts', label: 'Doubts', icon: '❓' },
        { href: '/circles', label: 'Circles', icon: '⭕' },
        { href: '/anon', label: 'Anon', icon: '🎭' },
        { href: '/materials', label: 'Materials', icon: '📝' },
        { href: '/calendar', label: 'Calendar', icon: '📅' },
        { href: '/attendance', label: 'Attendance', icon: '📊' },
        { href: '/session', label: 'Session', icon: '📖' },
        { href: '/analytics', label: 'Analytics', icon: '📈' },
      ]
    : [];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs">
              M
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)]">MitrAI</span>
            <span className="text-[10px] text-[var(--muted)] hidden sm:inline">SVNIT</span>
          </Link>

          {/* Desktop Nav — Compact with icons */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  pathname === link.href
                    ? 'bg-[var(--surface-light)] text-[var(--foreground)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
                title={link.label}
              >
                <span className="text-[11px]">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-[var(--surface-light)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-sm"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user ? (
              <>
                <Link href="/subscription" className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors px-2">
                  ✨ Pro
                </Link>
                <Link href="/feedback" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-2">
                  Feedback
                </Link>
                <div className="h-4 w-px bg-[var(--border)]" />
                <span className="text-xs text-[var(--muted)]">{user.name}</span>
                <button
                  onClick={logout}
                  className="text-xs text-[var(--muted)] hover:text-[var(--error)] transition-colors px-2"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-xs py-1.5 px-3">
                  Sign in
                </Link>
                <Link href="/login" className="btn-primary text-xs py-1.5 px-3">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 rounded-md hover:bg-[var(--surface-light)] text-[var(--muted)] text-sm"
          >
            {mobileOpen ? '\u2715' : '\u2630'}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileOpen && (
          <div className="md:hidden pb-3 border-t border-[var(--border)] mt-1 pt-2 fade-in">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${
                  pathname === link.href
                    ? 'bg-[var(--surface-light)] text-[var(--foreground)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/subscription" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-amber-400 font-medium">
                  <span>✨</span> Pro
                </Link>
                <Link href="/feedback" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)]">
                  <span>📝</span> Feedback
                </Link>
                <button onClick={() => toggleTheme()} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-[var(--muted)]">
                  <span>{theme === 'dark' ? '☀️' : '🌙'}</span> {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-[var(--error)]">
                  <span>🚪</span> Sign out
                </button>
              </>
            ) : (
              <>
                <button onClick={() => toggleTheme()} className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-[var(--muted)]">
                  <span>{theme === 'dark' ? '☀️' : '🌙'}</span> {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--primary-light)]">
                  <span>🔑</span> Sign in
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
