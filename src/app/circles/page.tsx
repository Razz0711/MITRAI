// ============================================
// MitrAI - Circles Page
// Browse & join interest circles
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

  if (loading) return <LoadingSkeleton />;

  const joined = circles.filter((c) => isJoined(c.id));
  const available = circles.filter((c) => !isJoined(c.id));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <SubTabBar group="connect" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Circles</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Join interest groups to find like-minded study buddies
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Dashboard
        </Link>
      </div>

      {/* My Circles */}
      {joined.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 dark:text-white">
            My Circles ({joined.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {joined.map((circle) => (
              <div
                key={circle.id}
                className="rounded-xl border-2 p-5 transition-all dark:bg-gray-800 flex flex-col"
                style={{ borderColor: circle.color }}
              >
                <Link href={`/circles/${circle.id}`} className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{circle.emoji}</span>
                    <div>
                      <h3 className="font-bold text-lg dark:text-white">{circle.name}</h3>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: circle.color }}
                        >
                          Joined ✓
                        </span>
                        <span className="text-xs text-gray-400">
                          {memberCounts[circle.id] || 0} member{(memberCounts[circle.id] || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    {circle.description}
                  </p>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); handleToggle(circle.id); }}
                  disabled={actionLoading === circle.id}
                  className="w-full py-2 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  {actionLoading === circle.id ? 'Leaving...' : 'Leave Circle'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Circles */}
      <section>
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          {joined.length > 0 ? 'Explore More' : 'Available Circles'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((circle) => (
            <div
              key={circle.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all dark:bg-gray-800 flex flex-col"
            >
              <Link href={`/circles/${circle.id}`} className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{circle.emoji}</span>
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">{circle.name}</h3>
                    <span className="text-xs text-gray-400">
                      {memberCounts[circle.id] || 0} member{(memberCounts[circle.id] || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {circle.description}
                </p>
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); handleToggle(circle.id); }}
                disabled={actionLoading === circle.id}
                className="w-full py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: circle.color }}
              >
                {actionLoading === circle.id ? 'Joining...' : 'Join Circle'}
              </button>
            </div>
          ))}
        </div>

        {available.length === 0 && joined.length > 0 && (
          <p className="text-center text-gray-400 py-8">
            🎉 You&apos;ve joined all available circles!
          </p>
        )}
      </section>
    </div>
  );
}
