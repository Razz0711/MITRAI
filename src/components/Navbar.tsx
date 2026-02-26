// ============================================
// MitrAI - Navigation Bar Component
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/onboarding', label: 'Get Started', icon: '🚀' },
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/matches', label: 'Matches', icon: '🤝' },
    { href: '/study-plan', label: 'Study Plan', icon: '📚' },
    { href: '/session', label: 'Session', icon: '💬' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-t-0 border-l-0 border-r-0 rounded-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <span className="text-xl font-bold gradient-text">MitrAI</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? 'bg-[var(--primary)]/20 text-[var(--primary-light)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5'
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-[var(--muted)]"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 fade-in">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  pathname === link.href
                    ? 'bg-[var(--primary)]/20 text-[var(--primary-light)]'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
