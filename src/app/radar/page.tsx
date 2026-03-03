// ============================================
// MitrAI - Campus Radar
// Real-time interest-based discovery on campus
// "Who's around me RIGHT NOW looking for the same thing?"
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/supabase-browser';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import SubTabBar from '@/components/SubTabBar';

const ACTIVITIES = [
  { id: 'study-dsa', emoji: '💻', label: 'DSA Practice', color: '#7c3aed' },
  { id: 'study-math', emoji: '📐', label: 'Math Study', color: '#06b6d4' },
  { id: 'study-general', emoji: '📚', label: 'General Study', color: '#3b82f6' },
  { id: 'music', emoji: '🎸', label: 'Music Jam', color: '#ec4899' },
  { id: 'cricket', emoji: '🏏', label: 'Cricket', color: '#22c55e' },
  { id: 'gym', emoji: '🏋️', label: 'Gym Buddy', color: '#f59e0b' },
  { id: 'gaming', emoji: '🎮', label: 'Gaming', color: '#8b5cf6' },
  { id: 'chai', emoji: '☕', label: 'Chai & Chat', color: '#f97316' },
  { id: 'walk', emoji: '🚶', label: 'Evening Walk', color: '#14b8a6' },
  { id: 'movie', emoji: '🎬', label: 'Watch Movie', color: '#e11d48' },
  { id: 'food', emoji: '🍕', label: 'Food Run', color: '#ea580c' },
  { id: 'hangout', emoji: '😎', label: 'Just Hangout', color: '#6366f1' },
];

const ZONES = [
  'Hostel', 'Library', 'Canteen', 'Ground', 'Department', 'Gate', 'Other',
];

interface RadarPing {
  id: string;
  userId: string;
  userName: string;
  activityId: string;
  zone: string;
  note: string;
  isAnonymous: boolean;
  createdAt: string;
  expiresAt: string;
}

export default function RadarPage() {
  const { user } = useAuth();
  const [pings, setPings] = useState<RadarPing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [myPing, setMyPing] = useState<RadarPing | null>(null);
  const [filterActivity, setFilterActivity] = useState<string>('');

  // Broadcast form
  const [selectedActivity, setSelectedActivity] = useState('');
  const [selectedZone, setSelectedZone] = useState('Hostel');
  const [note, setNote] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const loadPings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/radar?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setPings(data.data.pings || []);
        setMyPing(data.data.myPing || null);
      }
    } catch (err) {
      console.error('loadPings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPings();
    // Poll every 15s for fresh pings
    pollRef.current = setInterval(loadPings, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadPings]);

  // Realtime subscription for new pings
  useEffect(() => {
    if (!user) return;
    const channel = supabaseBrowser
      .channel('radar-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'radar_pings' },
        () => { loadPings(); }
      )
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [user, loadPings]);

  const handleBroadcast = async () => {
    if (!user || !selectedActivity) return;
    setBroadcasting(true);
    try {
      const res = await fetch('/api/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name || user.email?.split('@')[0] || 'Student',
          activityId: selectedActivity,
          zone: selectedZone,
          note: note.trim(),
          isAnonymous: isAnon,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowBroadcast(false);
        setNote('');
        setSelectedActivity('');
        await loadPings();
      }
    } catch (err) {
      console.error('broadcast:', err);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleStopBroadcast = async () => {
    if (!user) return;
    try {
      await fetch('/api/radar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      setMyPing(null);
      await loadPings();
    } catch (err) {
      console.error('stopBroadcast:', err);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const timeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'expired';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m left`;
    return `${Math.floor(mins / 60)}h left`;
  };

  const getActivity = (id: string) => ACTIVITIES.find(a => a.id === id);

  const filteredPings = filterActivity
    ? pings.filter(p => p.activityId === filterActivity)
    : pings;

  // Group by activity for the summary
  const activityCounts: Record<string, number> = {};
  pings.forEach(p => {
    activityCounts[p.activityId] = (activityCounts[p.activityId] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={4} label="Scanning campus..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
      <SubTabBar group="radar" />
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold mb-1">
          <span className="gradient-text">Campus Radar</span> 📡
        </h1>
        <p className="text-xs text-[var(--muted)]">
          Find people nearby, right now • {pings.length} active
        </p>
      </div>

      {/* My Status */}
      {myPing ? (
        <div className="card p-4 border-[var(--success)]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="text-2xl">{getActivity(myPing.activityId)?.emoji}</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--success)] rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold">You&apos;re broadcasting</p>
                <p className="text-[10px] text-[var(--muted)]">
                  {getActivity(myPing.activityId)?.label} • {myPing.zone} • {timeLeft(myPing.expiresAt)}
                </p>
              </div>
            </div>
            <button
              onClick={handleStopBroadcast}
              className="text-[10px] text-[var(--error)] hover:bg-[var(--error)]/10 px-3 py-1.5 rounded-lg transition-all"
            >
              Stop
            </button>
          </div>
        </div>
      ) : !showBroadcast ? (
        <button
          onClick={() => setShowBroadcast(true)}
          className="w-full card p-5 text-center hover:border-[var(--primary)]/40 transition-all group"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--primary)]/15 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
            📡
          </div>
          <p className="text-sm font-semibold">I&apos;m available for...</p>
          <p className="text-xs text-[var(--muted)] mt-1">Broadcast what you&apos;re looking for. Others nearby will see it.</p>
        </button>
      ) : (
        /* Broadcast Form */
        <div className="card p-5 border-[var(--primary)]/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">📡 What are you looking for?</span>
            <button onClick={() => setShowBroadcast(false)} className="text-xs text-[var(--muted)]">✕</button>
          </div>

          {/* Activity Grid */}
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITIES.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedActivity(a.id)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedActivity === a.id
                    ? 'ring-2 ring-[var(--primary)] bg-[var(--primary)]/10'
                    : 'bg-[var(--surface-light)] hover:bg-[var(--surface)]'
                }`}
              >
                <span className="text-xl block mb-1">{a.emoji}</span>
                <span className="text-[10px] font-medium block">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Zone selector */}
          <div>
            <label className="label">Where are you?</label>
            <div className="flex flex-wrap gap-2">
              {ZONES.map(z => (
                <button
                  key={z}
                  onClick={() => setSelectedZone(z)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedZone === z
                      ? 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30'
                      : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          {/* Optional note */}
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Quick note (e.g., 'near hostel 7', 'beginner welcome')"
            className="input-field text-xs"
            maxLength={100}
          />

          {/* Anonymous toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnon}
              onChange={e => setIsAnon(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-xs text-[var(--muted)]">Stay anonymous until I choose to reveal</span>
          </label>

          <button
            onClick={handleBroadcast}
            disabled={!selectedActivity || broadcasting}
            className="btn-primary w-full text-xs"
          >
            {broadcasting ? 'Broadcasting...' : '📡 Broadcast — I\'m Available!'}
          </button>
          <p className="text-[10px] text-[var(--muted)] text-center">Expires in 2 hours automatically</p>
        </div>
      )}

      {/* Activity Filter Pills */}
      {pings.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setFilterActivity('')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
              !filterActivity
                ? 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30'
                : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'
            }`}
          >
            All ({pings.length})
          </button>
          {Object.entries(activityCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([actId, count]) => {
              const act = getActivity(actId);
              if (!act) return null;
              return (
                <button
                  key={actId}
                  onClick={() => setFilterActivity(filterActivity === actId ? '' : actId)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                    filterActivity === actId
                      ? 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30'
                      : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'
                  }`}
                >
                  {act.emoji} {act.label} ({count})
                </button>
              );
            })}
        </div>
      )}

      {/* Live Pings Feed */}
      {filteredPings.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="text-4xl mb-3 block">📡</span>
          <p className="text-sm font-medium mb-1">Campus is quiet right now</p>
          <p className="text-xs text-[var(--muted)] mb-4">Be the first to broadcast — others will discover you!</p>
          {!myPing && (
            <button onClick={() => setShowBroadcast(true)} className="btn-primary text-xs">
              Start Broadcasting
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--success)] rounded-full animate-pulse" />
            Live on Campus
          </h2>
          {filteredPings.map(ping => {
            const act = getActivity(ping.activityId);
            const isMe = ping.userId === user?.id;
            return (
              <div
                key={ping.id}
                className={`card p-4 transition-all ${isMe ? 'border-[var(--success)]/30' : 'hover:border-[var(--primary)]/40'}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: (act?.color || '#7c3aed') + '20' }}
                  >
                    {act?.emoji || '📡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate">
                        {isMe ? 'You' : (ping.isAnonymous ? '🕵️ Anonymous' : ping.userName)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-light)] text-[var(--muted)]">
                        {ping.zone}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--primary-light)] font-medium">
                      Looking for {act?.label || 'something'}
                    </p>
                    {ping.note && (
                      <p className="text-xs text-[var(--muted)] mt-1">&ldquo;{ping.note}&rdquo;</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-[var(--muted)]">{timeAgo(ping.createdAt)}</span>
                      <span className="text-[10px] text-[var(--muted)]">⏱ {timeLeft(ping.expiresAt)}</span>
                    </div>
                  </div>
                  {!isMe && !ping.isAnonymous && (
                    <Link
                      href={`/chat?friendId=${encodeURIComponent(ping.userId)}&friendName=${encodeURIComponent(ping.userName)}`}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/25 transition-all"
                    >
                      💬 Say Hi
                    </Link>
                  )}
                  {!isMe && ping.isAnonymous && (
                    <span className="shrink-0 text-[10px] text-[var(--muted)] px-2 py-1">🕵️</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Info */}
      <div className="text-center py-4">
        <p className="text-[10px] text-[var(--muted)]">
          Broadcasts expire automatically after 2 hours • Only your campus can see this
        </p>
      </div>
    </div>
  );
}
