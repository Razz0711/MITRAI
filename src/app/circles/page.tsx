// ============================================
// MitrAI - Circles Page (Redesigned)
// Clean interest groups with CSS variables
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import SubTabBar from '@/components/SubTabBar';

interface Circle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

interface Membership {
  circleId: string;
  createdAt: string;
}

export default function CirclesPage() {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadCircles = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/circles?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setCircles(data.data.circles || []);
        setMemberships(data.data.memberships || []);
        setMemberCounts(data.data.memberCounts || {});
      }
    } catch (err) {
      console.error('loadCircles:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCircles();
  }, [loadCircles]);

  const isJoined = (circleId: string) =>
    memberships.some((m) => m.circleId === circleId);

  const handleToggle = async (circleId: string) => {
    if (!user) return;
    setActionLoading(circleId);
    const action = isJoined(circleId) ? 'leave' : 'join';
    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, circleId, userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        await loadCircles();
      }
    } catch (err) {
      console.error('circle toggle:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={4} label="Loading circles..." />
      </div>
    );
  }

  const joined = circles.filter((c) => isJoined(c.id));
  const available = circles.filter((c) => !isJoined(c.id));
  const filtered = (arr: Circle[]) =>
    search ? arr.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())) : arr;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
      <SubTabBar group="chat" />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold mb-1">
          <span className="gradient-text">Circles</span> ⭕
        </h1>
        <p className="text-xs text-[var(--muted)]">
          Join interest groups • {circles.length} circles • {Object.values(memberCounts).reduce((a, b) => a + b, 0)} total members
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search circles..."
          className="input-field pl-8 text-xs py-2.5"
        />
      </div>

      {/* My Circles */}
      {filtered(joined).length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">✨ My Circles</h2>
            <span className="text-[10px] text-[var(--muted)]">{joined.length} joined</span>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {filtered(joined).map((circle) => (
              <div
                key={circle.id}
                className="card p-4 transition-all hover:border-[var(--primary)]/40"
                style={{ borderLeftWidth: '3px', borderLeftColor: circle.color }}
              >
                <Link href={`/circles/${circle.id}`} className="block">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: circle.color + '20' }}>
                      {circle.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{circle.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--success)] font-medium">● Joined</span>
                        <span className="text-[10px] text-[var(--muted)]">
                          {memberCounts[circle.id] || 0} members
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3">
                    {circle.description}
                  </p>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); handleToggle(circle.id); }}
                  disabled={actionLoading === circle.id}
                  className="w-full py-1.5 rounded-lg text-[10px] font-medium text-[var(--muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 border border-[var(--border)] transition-all disabled:opacity-50"
                >
                  {actionLoading === circle.id ? 'Leaving...' : 'Leave'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Circles */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">
            {joined.length > 0 ? '🔍 Explore More' : '🌟 Available Circles'}
          </h2>
          <span className="text-[10px] text-[var(--muted)]">{available.length} available</span>
        </div>
        {filtered(available).length === 0 ? (
          <div className="card p-8 text-center">
            <span className="text-3xl mb-2 block">{search ? '🔍' : '🎉'}</span>
            <p className="text-xs text-[var(--muted)]">
              {search ? `No circles match "${search}"` : "You've joined all available circles!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {filtered(available).map((circle) => (
              <div
                key={circle.id}
                className="card p-4 hover:border-[var(--primary)]/40 transition-all flex flex-col"
              >
                <Link href={`/circles/${circle.id}`} className="flex-1 block">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: circle.color + '20' }}>
                      {circle.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{circle.name}</h3>
                      <span className="text-[10px] text-[var(--muted)]">
                        {memberCounts[circle.id] || 0} member{(memberCounts[circle.id] || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3">
                    {circle.description}
                  </p>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); handleToggle(circle.id); }}
                  disabled={actionLoading === circle.id}
                  className="w-full py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition-all hover:opacity-90"
                  style={{ backgroundColor: circle.color }}
                >
                  {actionLoading === circle.id ? 'Joining...' : '+ Join Circle'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
