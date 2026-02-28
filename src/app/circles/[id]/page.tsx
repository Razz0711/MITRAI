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
import { Users, MessageCircle, ArrowLeft } from 'lucide-react';

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
        <p className="text-[var(--muted)] text-lg mb-2">Circle not found.</p>
        <Link href="/circles" className="text-[var(--primary-light)] hover:underline">
          ← Back to Circles
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/circles"
          className="mt-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{circle.emoji}</span>
            <h1 className="text-xl font-bold text-[var(--foreground)]">{circle.name}</h1>
          </div>
          {circle.description && (
            <p className="text-sm text-[var(--muted)] ml-12">{circle.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 ml-12 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <Users size={12} /> {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={12} /> {rooms.length} room{rooms.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={actionLoading}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 ${
            isMember
              ? 'border border-[var(--error)]/30 text-[var(--error)] hover:bg-[var(--error)]/10'
              : 'text-white'
          }`}
          style={!isMember ? { backgroundColor: circle.color } : undefined}
        >
          {actionLoading
            ? isMember ? 'Leaving...' : 'Joining...'
            : isMember ? 'Leave Circle' : 'Join Circle'}
        </button>
      </div>

      {/* Study Rooms */}
      <section>
        <h2 className="text-sm font-bold text-[var(--foreground)] mb-3">
          Study Rooms ({rooms.length})
        </h2>
        {rooms.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm text-[var(--muted)]">No active rooms in this circle yet.</p>
            <Link
              href="/rooms"
              className="inline-block mt-3 text-xs text-[var(--primary-light)] hover:underline"
            >
              Create a room →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/rooms/${room.id}`}
                className="card p-4 hover:border-[var(--primary)]/40 transition-colors group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary-light)] transition-colors">
                    {room.name}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      room.status === 'active'
                        ? 'bg-[var(--success)]/15 text-[var(--success)]'
                        : 'bg-[var(--surface-light)] text-[var(--muted)]'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>
                {room.topic && (
                  <p className="text-xs text-[var(--muted)] mb-1">📌 {room.topic}</p>
                )}
                {room.description && (
                  <p className="text-xs text-[var(--muted)] line-clamp-2">{room.description}</p>
                )}
                <p className="text-[10px] text-[var(--muted)] mt-2">
                  Max {room.maxMembers} members
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Members */}
      <section>
        <h2 className="text-sm font-bold text-[var(--foreground)] mb-3">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-[var(--muted)]">No members yet. Be the first to join!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m) => (
              <div key={m.userId} className="card p-3 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ backgroundColor: circle.color }}
                >
                  {m.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {m.name}
                    {m.userId === user?.id && (
                      <span className="text-[10px] text-[var(--muted)] ml-1">(you)</span>
                    )}
                  </p>
                  {m.department && (
                    <p className="text-[10px] text-[var(--muted)] truncate">{m.department}</p>
                  )}
                </div>
                <span className="text-[10px] text-[var(--muted)] shrink-0">
                  {new Date(m.joinedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
