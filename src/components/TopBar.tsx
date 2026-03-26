// ============================================
// MitrrAi v2 - Navigation Components
// Exported separately for proper flex ordering
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Sparkles, Ghost, MessageCircle, CircleDot,
} from 'lucide-react';
import { getActiveTab } from './BottomTabs';

const tabs = [
  { id: 'home', label: 'Home', icon: LayoutGrid, href: '/home' },
  { id: 'arya', label: 'Arya', icon: Sparkles, href: '/arya' },
  { id: 'anon', label: 'Anon', icon: Ghost, href: '/anon' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, href: '/chat' },
  { id: 'circles', label: 'Community', icon: CircleDot, href: '/circles' },
];

/* ─── Desktop Top Header ─── */
export function DesktopHeader() {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  return (
    <header className="shrink-0 hidden md:block" style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(20px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
      borderBottom: '1px solid var(--glass-border)',
    }}>
      <div className="flex items-center h-14 px-4 max-w-7xl mx-auto">
        <nav className="flex items-center justify-center gap-1 flex-1">
          {tabs.map(tab => {
            const isActive = tab.id === activeTab || (tab.id === 'circles' && activeTab === 'circles');
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-[var(--primary)]/15 text-[var(--primary-light)] shadow-sm'
                    : 'text-[var(--muted-strong)] hover:text-[var(--foreground)] hover:bg-[var(--surface-light)]'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/* ─── Mobile Bottom Tab Bar ─── */
export function MobileNavbar() {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  const hideBottomTabs =
    /^\/anon\/[^/]+/.test(pathname) ||
    /^\/chat/.test(pathname) ||
    /^\/call(\/|$)/.test(pathname) ||
    /^\/arya\/chat/.test(pathname) ||
    /^\/rooms/.test(pathname);

  if (hideBottomTabs) return null;

  return (
    <nav className="md:hidden shrink-0" style={{
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(24px) saturate(1.6)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
      borderTop: '1px solid var(--glass-border)',
    }}>
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab || (tab.id === 'circles' && activeTab === 'circles');
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'text-[var(--primary-light)]'
                  : 'text-[var(--muted-strong)] hover:text-[var(--foreground)]'
              }`}
            >
              <div className="relative p-1.5 rounded-xl transition-all duration-300">
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className={`text-[11px] font-semibold transition-all duration-300 ${isActive ? 'opacity-100' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] rounded-full"
                  style={{
                    width: 20,
                    background: 'linear-gradient(90deg, var(--primary), #c026d3)',
                    animation: 'navIndicator 0.3s ease-out',
                    boxShadow: '0 0 8px rgba(124,58,237,0.5)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Default export for backward compatibility ─── */
export default function TopBar() {
  return (
    <>
      <DesktopHeader />
      <MobileNavbar />
    </>
  );
}
