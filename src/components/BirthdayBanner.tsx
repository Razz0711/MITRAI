// ============================================
// MitrAI - Birthday Banner Component
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { BirthdayInfo } from '@/lib/types';

interface BirthdayBannerProps {
  birthdays: BirthdayInfo[];
  currentUserId: string;
  wishedMap: Record<string, boolean>;
  onWish: (toUserId: string, toUserName: string) => Promise<void>;
}

export default function BirthdayBanner({ birthdays, currentUserId, wishedMap, onWish }: BirthdayBannerProps) {
  const [wishingId, setWishingId] = useState<string | null>(null);
  const [localWished, setLocalWished] = useState<Record<string, boolean>>({});
  const [currentDate, setCurrentDate] = useState(() => new Date().toDateString());

  // Check every minute if the date has changed; if so, force re-filter
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toDateString();
      if (now !== currentDate) {
        setCurrentDate(now);
      }
    }, 60_000); // check every 60 seconds
    return () => clearInterval(interval);
  }, [currentDate]);

  // Re-filter birthdays based on current client date
  const todayBirthdays = birthdays.filter(b => {
    if (b.userId === currentUserId) return false;
    // Validate isToday against the client's current date
    if (!b.isToday) return false;
    // Double-check: if dayMonth is available, verify against current client date
    if (b.dayMonth) {
      const now = new Date();
      const todayDM = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return b.dayMonth === todayDM;
    }
    return true;
  });

  if (todayBirthdays.length === 0) return null;

  const handleWish = async (toUserId: string, toUserName: string) => {
    setWishingId(toUserId);
    try {
      await onWish(toUserId, toUserName);
      setLocalWished(prev => ({ ...prev, [toUserId]: true }));
    } finally {
      setWishingId(null);
    }
  };

  return (
    <div className="mb-6 space-y-3">
      {todayBirthdays.map(b => {
        const hasWished = wishedMap[b.userId] || localWished[b.userId];
        return (
          <div
            key={b.userId}
            className="relative overflow-hidden rounded-xl border border-purple-500/30"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(139,92,246,0.15) 50%, rgba(168,85,247,0.2) 100%)',
            }}
          >
            {/* Confetti dots */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <span
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full opacity-60"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'][i % 6],
                    animation: `confetti ${2 + Math.random() * 3}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>

            <div className="relative p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-purple-500/30 border-2 border-purple-400/50 flex items-center justify-center text-lg font-bold text-purple-300 shrink-0">
                  {b.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    🎂 Today is {b.userName}&apos;s Birthday! 🎉
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {b.department} &middot; Wish them well!
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleWish(b.userId, b.userName)}
                disabled={hasWished || wishingId === b.userId}
                className={`shrink-0 text-xs py-2 px-4 rounded-lg font-medium transition-all ${
                  hasWished
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 hover:text-white'
                }`}
              >
                {hasWished ? '✓ Wished!' : wishingId === b.userId ? '...' : '🎉 Wish!'}
              </button>
            </div>
          </div>
        );
      })}

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-8px) rotate(180deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// Upcoming Birthdays Widget (Sidebar)
// ============================================

interface UpcomingBirthdaysProps {
  birthdays: BirthdayInfo[];
  currentUserId: string;
}

export function UpcomingBirthdays({ birthdays, currentUserId }: UpcomingBirthdaysProps) {
  const upcoming = birthdays
    .filter(b => b.userId !== currentUserId && b.daysUntil > 0 && b.daysUntil <= 7)
    .slice(0, 5);

  if (upcoming.length === 0) return null;

  const getDaysLabel = (days: number): string => {
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold mb-3">🎂 Upcoming Birthdays</h2>
      <div className="space-y-2.5">
        {upcoming.map(b => (
          <div key={b.userId} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-xs font-bold text-purple-400">
                {b.userName.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--foreground)]">{b.userName}</p>
                <p className="text-[10px] text-[var(--muted)]">{b.department}</p>
              </div>
            </div>
            <span className="text-[10px] text-purple-400 font-medium">
              {getDaysLabel(b.daysUntil)} 🎂
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
