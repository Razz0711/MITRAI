// ============================================
// MitrAI - SubTabBar (Horizontal pill-style sub-tabs)
// Used within Connect, Learn, and Discover tab groups
// ============================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SubTab {
  label: string;
  href: string;
  icon: string;
}

const SUB_TABS: Record<string, SubTab[]> = {
  connect: [
    { label: 'Direct', href: '/chat', icon: '💬' },
    { label: 'Circles', href: '/circles', icon: '⭕' },
    { label: 'Rooms', href: '/rooms', icon: '📚' },
  ],
  learn: [
    { label: 'Session', href: '/session', icon: '🤖' },
    { label: 'Doubts', href: '/doubts', icon: '❓' },
    { label: 'Materials', href: '/materials', icon: '📝' },
  ],
  discover: [
    { label: 'Matches', href: '/matches', icon: '🤝' },
    { label: 'Friends', href: '/friends', icon: '👥' },
    { label: 'Anonymous', href: '/anon', icon: '🎭' },
  ],
};

export default function SubTabBar({ group }: { group: 'connect' | 'learn' | 'discover' }) {
  const pathname = usePathname();
  const tabs = SUB_TABS[group] || [];

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 mb-4">
      {tabs.map(tab => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-light)] border border-[var(--border)]'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
