// ============================================
// MitrAI - Navigation Bar
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = user
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/matches', label: 'Matches' },
        { href: '/friends', label: 'Friends' },
        { href: '/chat', label: 'Chat' },
        { href: '/materials', label: 'Materials' },
        { href: '/study-plan', label: 'Study Plan' },
        { href: '/session', label: 'Session' },
        { href: '/call', label: 'Call' },
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

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-[var(--surface-light)] text-[var(--foreground)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-2">
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
                className={`block px-3 py-2 rounded-md text-xs font-medium ${
                  pathname === link.href
                    ? 'bg-[var(--surface-light)] text-[var(--foreground)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/subscription" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-xs text-amber-400 font-medium">
                  ✨ Pro
                </Link>
                <Link href="/feedback" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-xs text-[var(--muted)]">
                  Feedback
                </Link>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-xs text-[var(--error)]">
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-xs text-[var(--primary-light)]">
                Sign in
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
