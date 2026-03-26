// ============================================
// MitrRAI - Beautiful Empty State Component
// Replaces boring "No data" with engaging illustrations
// ============================================

'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

const PRESETS: Record<string, { emoji: string; title: string; description: string }> = {
  feed: {
    emoji: '📝',
    title: 'No posts yet',
    description: 'Be the first to share something with your campus!',
  },
  chat: {
    emoji: '💬',
    title: 'No conversations yet',
    description: 'Find people and start chatting!',
  },
  friends: {
    emoji: '👥',
    title: 'No friends yet',
    description: 'Send friend requests to people you meet on campus.',
  },
  notifications: {
    emoji: '🔔',
    title: 'All caught up!',
    description: 'No new notifications. Check back later!',
  },
  matches: {
    emoji: '🤝',
    title: 'No matches yet',
    description: 'Complete your profile to find study buddies.',
  },
  doubts: {
    emoji: '❓',
    title: 'No doubts yet',
    description: 'Ask a question or share a confession!',
  },
  circles: {
    emoji: '⭕',
    title: 'No circles found',
    description: 'Create or join a study circle to get started.',
  },
  rooms: {
    emoji: '🚪',
    title: 'No active rooms',
    description: 'Create a room to start a group conversation.',
  },
  search: {
    emoji: '🔍',
    title: 'No results found',
    description: 'Try a different search term.',
  },
  filter: {
    emoji: '🎯',
    title: 'No posts match your filters',
    description: 'Try adjusting your filter criteria.',
  },
  pending: {
    emoji: '⏳',
    title: 'No pending requests',
    description: 'You\'re all caught up!',
  },
};

export default function EmptyState({ emoji, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`}
      style={{ animation: 'fadeSlideUp 0.5s ease-out' }}
    >
      {/* Animated emoji with glow ring */}
      <div className="relative mb-4">
        <div
          className={`${compact ? 'w-14 h-14' : 'w-20 h-20'} rounded-2xl flex items-center justify-center`}
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(244,114,182,0.08))',
            border: '1px solid rgba(124,58,237,0.12)',
            animation: 'float 4s ease-in-out infinite',
          }}
        >
          <span className={compact ? 'text-2xl' : 'text-3xl'}>{emoji || '📭'}</span>
        </div>
        {/* Subtle pulse ring */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            border: '1px solid rgba(124,58,237,0.15)',
            animation: 'pulseRing 3s ease-out infinite',
          }}
        />
      </div>

      <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-[var(--foreground)] mb-1`}>
        {title}
      </h3>
      {description && (
        <p className={`${compact ? 'text-[11px]' : 'text-sm'} text-[var(--muted)] max-w-[260px] leading-relaxed`}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Quick preset usage: <EmptyStatePreset type="feed" /> */
export function EmptyStatePreset({
  type,
  action,
  compact = false,
}: {
  type: keyof typeof PRESETS;
  action?: ReactNode;
  compact?: boolean;
}) {
  const preset = PRESETS[type];
  if (!preset) return null;
  return <EmptyState {...preset} action={action} compact={compact} />;
}
