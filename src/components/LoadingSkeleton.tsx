// ============================================
// MitrAI - Loading Skeleton Components
// ============================================

'use client';

/** Animated pulse bar */
function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[var(--surface-light)] ${className}`} />
  );
}

/** Card skeleton for friend/match cards */
export function FriendCardSkeleton() {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <SkeletonBar className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <SkeletonBar className="h-3 w-24" />
          <SkeletonBar className="h-2 w-16" />
        </div>
      </div>
      <div className="flex gap-2">
        <SkeletonBar className="h-7 w-16 rounded-lg" />
        <SkeletonBar className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}

/** Dashboard stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBar className="h-3 w-20" />
        <SkeletonBar className="h-6 w-6 rounded-md" />
      </div>
      <SkeletonBar className="h-6 w-12" />
      <SkeletonBar className="h-2 w-full" />
    </div>
  );
}

/** Row skeleton for attendance/calendar items */
export function RowSkeleton() {
  return (
    <div className="card p-3 flex items-center gap-3">
      <SkeletonBar className="w-8 h-8 rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonBar className="h-3 w-3/4" />
        <SkeletonBar className="h-2 w-1/2" />
      </div>
      <SkeletonBar className="h-6 w-14 rounded-lg" />
    </div>
  );
}

/** Material card skeleton */
export function MaterialCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <SkeletonBar className="w-8 h-8 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBar className="h-3 w-3/4" />
          <SkeletonBar className="h-2 w-1/2" />
        </div>
      </div>
      <SkeletonBar className="h-2 w-full" />
      <div className="flex gap-2">
        <SkeletonBar className="h-5 w-16 rounded-full" />
        <SkeletonBar className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

/** Full-page skeleton with a configurable number of cards */
export default function LoadingSkeleton({
  type = 'cards',
  count = 4,
  label = 'Loading...',
}: {
  type?: 'cards' | 'stats' | 'rows' | 'materials';
  count?: number;
  label?: string;
}) {
  const SkeletonItem =
    type === 'stats' ? StatCardSkeleton
    : type === 'rows' ? RowSkeleton
    : type === 'materials' ? MaterialCardSkeleton
    : FriendCardSkeleton;

  return (
    <div className="space-y-3 fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
        <span className="text-xs text-[var(--muted)]">{label}</span>
      </div>
      {type === 'stats' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonItem key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonItem key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
