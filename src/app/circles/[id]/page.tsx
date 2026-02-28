// ============================================
// MitrAI - Circle Detail Page
// Shows members, study rooms, and activity
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Circle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

interface Member {
  userId: string;
  name: string;
  department: string;
  joinedAt: string;
}

interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  maxMembers: number;
  status: string;
  createdAt: string;
}

export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState<'members' | 'rooms'>('members');

  const loadCircle = useCallback(async () => {
    if (!user || !id) return;
    try {
      const res = await fetch(`/api/circles/${id}`);
      const data = await res.json();
      if (data.success) {
        setCircle(data.data.circle);
        setMembers(data.data.members || []);
        setRooms(data.data.rooms || []);
        setIsMember(
          (data.data.members || []).some(
            (m: Member) => m.userId === user.id
          )
        );
      }
    } catch (err) {
      console.error('loadCircle:', err);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    loadCircle();
  }, [loadCircle]);

  const handleToggle = async () => {
    if (!user || !circle) return;
    setActionLoading(true);
    const action = isMember ? 'leave' : 'join';
    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, circleId: circle.id, userId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        await loadCircle();
      }
    } catch (err) {
      console.error('circle toggle:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!circle) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Circle Not Found
        </h1>
        <Link href="/circles" className="text-indigo-600 hover:underline dark:text-indigo-400">
          ← Back to Circles
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back link */}
      <Link
        href="/circles"
        className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← All Circles
      </Link>

      {/* Circle Header */}
      <div
        className="rounded-2xl p-6 border-2 dark:bg-gray-800"
        style={{ borderColor: circle.color }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{circle.emoji}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {circle.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {circle.description}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: circle.color }}
                >
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-400">
                  {rooms.length} active room{rooms.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleToggle}
            disabled={actionLoading}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 ${
              isMember
                ? 'border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20'
                : 'text-white'
            }`}
            style={!isMember ? { backgroundColor: circle.color } : undefined}
          >
            {actionLoading
              ? isMember
                ? 'Leaving...'
                : 'Joining...'
              : isMember
              ? 'Leave Circle'
              : 'Join Circle'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {(['members', 'rooms'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t === 'members' ? `Members (${members.length})` : `Rooms (${rooms.length})`}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="space-y-3">
          {members.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              No members yet. Be the first to join!
            </p>
          ) : (
            members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Avatar placeholder */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: circle.color }}
                >
                  {m.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {m.name}
                  </p>
                  {m.department && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {m.department}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  Joined {new Date(m.joinedAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rooms Tab */}
      {tab === 'rooms' && (
        <div className="space-y-3">
          {rooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-3">
                No study rooms in this circle yet.
              </p>
              <Link
                href="/rooms"
                className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Create a Room →
              </Link>
            </div>
          ) : (
            rooms.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {room.name}
                    </h3>
                    {room.topic && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {room.topic}
                      </p>
                    )}
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                    Active
                  </span>
                </div>
                {room.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                    {room.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>Max {room.maxMembers} members</span>
                  <span>·</span>
                  <span>{new Date(room.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
