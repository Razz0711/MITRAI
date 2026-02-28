// ============================================
// MitrAI - Top Tab Navigation (5 Tabs)
// Mobile-first top tab bar below the header
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { id: 'home', label: 'Home', icon: '🏠', href: '/home' },
  { id: 'connect', label: 'Connect', icon: '💬', href: '/chat' },
  { id: 'learn', label: 'Learn', icon: '📚', href: '/session' },
  { id: 'discover', label: 'Discover', icon: '🎨', href: '/matches' },
  { id: 'me', label: 'Me', icon: '👤', href: '/me' },
];

export const TAB_ROUTES: Record<string, string[]> = {
  home: ['/home', '/dashboard', '/calendar', '/study-plan'],
  connect: ['/chat', '/circles', '/rooms', '/call'],
  learn: ['/session', '/doubts', '/materials'],
  discover: ['/matches', '/friends', '/anon'],
  me: ['/me', '/subscription', '/attendance', '/analytics', '/feedback', '/onboarding'],
};

export function getActiveTab(pathname: string): string {
  for (const [tabId, routes] of Object.entries(TAB_ROUTES)) {
    if (routes.some(r => pathname === r || pathname.startsWith(r + '/'))) {
      return tabId;
    }
  }
  return 'home';
}

export default function BottomTabs() {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  return (
    <nav className="fixed top-12 left-0 right-0 z-40 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
      <div className="flex items-center justify-around h-12 max-w-lg mx-auto px-2">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all ${
                isActive
                  ? 'text-[var(--primary-light)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span className={`text-base transition-transform ${isActive ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[var(--primary-light)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
