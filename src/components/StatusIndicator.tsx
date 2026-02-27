// ============================================
// MitrAI - Online Status Indicator Component
// ============================================

'use client';

import { UserStatus, OnlineStatusType } from '@/lib/types';

interface StatusDotProps {
  status: OnlineStatusType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  currentSubject?: string;
  lastSeen?: string;
}

function getTimeSince(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function StatusDot({ status, size = 'sm', showLabel = false, currentSubject, lastSeen }: StatusDotProps) {
  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  const colors: Record<OnlineStatusType, string> = {
    'online': 'bg-green-500',
    'in-session': 'bg-amber-500',
    'offline': 'bg-gray-500',
  };

  const pulseColors: Record<OnlineStatusType, string> = {
    'online': 'bg-green-400',
    'in-session': 'bg-amber-400',
    'offline': '',
  };

  const labels: Record<OnlineStatusType, string> = {
    'online': 'Online',
    'in-session': 'In a Session',
    'offline': 'Offline',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <span className={`block rounded-full ${sizeClasses[size]} ${colors[status]}`} />
        {status !== 'offline' && (
          <span className={`absolute inset-0 rounded-full ${pulseColors[status]} animate-ping opacity-40`} />
        )}
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className="text-[10px] text-[var(--muted)]">{labels[status]}</span>
          {status === 'in-session' && currentSubject && (
            <span className="text-[10px] text-amber-400">Studying: {currentSubject}</span>
          )}
          {status === 'offline' && lastSeen && (
            <span className="text-[10px] text-gray-500">Last seen {getTimeSince(lastSeen)}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ userStatus }: { userStatus?: UserStatus | null }) {
  if (!userStatus) {
    return <StatusDot status="offline" />;
  }
  return (
    <StatusDot
      status={userStatus.status}
      currentSubject={userStatus.currentSubject}
      lastSeen={userStatus.lastSeen}
    />
  );
}
