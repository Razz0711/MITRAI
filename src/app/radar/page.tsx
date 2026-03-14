// ============================================
// MitrAI - Campus Radar (Redesigned)
// Real-time campus discovery with heatmap, SOS, live feed + Ping
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/supabase-browser';
import LoadingSkeleton from '@/components/LoadingSkeleton';

/* ─── Activities (4-col grid with emojis) ─── */
const ACTIVITIES = [
  { id: 'study-dsa', label: 'DSA', emoji: '💻', color: '#7c3aed' },
  { id: 'study-math', label: 'Math', emoji: '📐', color: '#06b6d4' },
  { id: 'study-general', label: 'Study', emoji: '📚', color: '#3b82f6' },
  { id: 'chai', label: 'Chai', emoji: '☕', color: '#f97316' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', color: '#8b5cf6' },
  { id: 'food', label: 'Food Run', emoji: '🍔', color: '#ea580c' },
  { id: 'cricket', label: 'Cricket', emoji: '🏏', color: '#22c55e' },
  { id: 'other', label: 'Other...', emoji: '✏️', color: '#6366f1' },
];

const ZONES = ['Library', 'Canteen', 'Hostel', 'Dept', 'Ground', 'Gate'];

const ZONE_EMOJIS: Record<string, string> = {
  Library: '📚',
  Canteen: '🍽️',
  Hostel: '🏠',
  Dept: '🏛️',
  Ground: '⛳',
  Gate: '🚪',
  Department: '🏛️',
  Other: '📍',
};

interface RadarPing {
  id: string;
  userId: string;
  userName: string;
  activityId: string;
  zone: string;
  note: string;
  isAnonymous: boolean;
  isSOS?: boolean;
  createdAt: string;
  expiresAt: string;
}

/* ─── Avatar color helper ─── */
const AVATAR_COLORS = [
  'bg-violet-600', 'bg-emerald-600', 'bg-blue-600', 'bg-pink-600',
  'bg-amber-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-rose-600',
  'bg-orange-600', 'bg-teal-600',
];
const getAvatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

export default function RadarPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pings, setPings] = useState<RadarPing[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPing, setMyPing] = useState<RadarPing | null>(null);

  // Broadcast form
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [selectedZone, setSelectedZone] = useState('Library');
  const [note, setNote] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [isSOS, setIsSOS] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  /* ─── Data loading ─── */
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
    pollRef.current = setInterval(loadPings, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadPings]);

  useEffect(() => {
    if (!user) return;
    const channel = supabaseBrowser
      .channel('radar-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radar_pings' }, () => { loadPings(); })
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [user, loadPings]);

  /* ─── Actions ─── */
  const handleBroadcast = async () => {
    if (!user || !selectedActivity) return;
    setBroadcasting(true);
    try {
      const activityId = selectedActivity === 'other' ? `custom:${customActivity.trim() || 'Other'}` : selectedActivity;
      const res = await fetch('/api/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name || user.email?.split('@')[0] || 'Student',
          activityId,
          zone: selectedZone,
          note: note.trim() + (isSOS ? ' [SOS]' : ''),
          isAnonymous: isAnon,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNote('');
        setSelectedActivity('');
        setCustomActivity('');
        setIsSOS(false);
        await loadPings();
      } else {
        alert(data.error || 'Failed to broadcast.');
      }
    } catch {
      alert('Network error — please check your connection.');
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

  const handlePing = async (ping: RadarPing) => {
    if (!user) return;
    setConnectingTo(ping.id);
    try {
      const res = await fetch('/api/radar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pingId: ping.id,
          connectorName: user.name || user.email?.split('@')[0] || 'Student',
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.type === 'anonymous') {
          router.push(`/anon/${data.data.roomId}`);
        } else {
          router.push(`/chat?friendId=${encodeURIComponent(data.data.broadcasterId)}&friendName=${encodeURIComponent(data.data.broadcasterName)}`);
        }
      } else {
        alert(data.error || 'Could not connect.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setConnectingTo(null);
    }
  };

  /* ─── Helpers ─── */
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const timeLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'expired';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rm = mins % 60;
    return `${hrs}h ${rm}m`;
  };

  const getActivity = (id: string) => {
    if (id.startsWith('custom:')) return { id, label: id.slice(7), emoji: '✏️', color: '#6366f1' };
    return ACTIVITIES.find(a => a.id === id);
  };

  /* ─── Computed ─── */
  // Zone counts for heatmap
  const zoneCounts: Record<string, number> = {};
  pings.forEach(p => {
    const z = p.zone;
    zoneCounts[z] = (zoneCounts[z] || 0) + 1;
  });
  const totalActive = pings.length;
  const maxZoneCount = Math.max(...Object.values(zoneCounts), 1);

  // SOS pings
  const sosPings = pings.filter(p => p.note?.includes('[SOS]') && p.userId !== user?.id);

  // Non-SOS pings for the feed
  const feedPings = pings.filter(p => p.userId !== user?.id);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={4} label="Scanning campus..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5 radar-polish relative">
      <div className="radar-aura radar-aura-1" />
      <div className="radar-aura radar-aura-2" />

      {/* ─── Header ─── */}
      <div className="text-center slide-up">
        <h1 className="text-xl font-extrabold mb-1">
          <span className="gradient-text">Campus Radar</span>
        </h1>
        <p className="text-xs text-[var(--muted)]">
          Who&apos;s active right now · Only SVNIT can see this
        </p>
      </div>

      {/* ─── Status Bar ─── */}
      {myPing ? (
        <div className="rounded-2xl p-4 flex items-center justify-between slide-up-stagger-1" style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(6,182,212,0.05))',
          border: '1px solid rgba(34,197,94,0.25)',
        }}>
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">You&apos;re live on Radar</p>
              <p className="text-[11px] text-[var(--muted)]">
                {getActivity(myPing.activityId)?.label} · {myPing.zone} · expires in {timeLeft(myPing.expiresAt)}
              </p>
            </div>
          </div>
          <button
            onClick={handleStopBroadcast}
            className="px-5 py-2 rounded-xl text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            Stop
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-4 flex items-center justify-between slide-up-stagger-1" style={{
          background: 'var(--surface)',
          border: '1px solid var(--glass-border)',
        }}>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <div>
              <p className="text-sm font-semibold text-[var(--muted)]">You&apos;re not broadcasting</p>
              <p className="text-[11px] text-[var(--muted)]">Set your activity below and go live</p>
            </div>
          </div>
          <a href="#broadcast-form" className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all" style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 2px 12px rgba(34,197,94,0.3)',
          }}>
            Go Live →
          </a>
        </div>
      )}

      {/* ─── Campus Heatmap ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
            WHERE&apos;S THE ACTION
          </h2>
          <span className="text-[10px] text-[var(--muted)]">{totalActive} active on campus</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {['Library', 'Canteen', 'Hostel', 'Department', 'Ground', 'Gate'].map(zone => {
            const count = zoneCounts[zone] || 0;
            const barWidth = maxZoneCount > 0 ? (count / maxZoneCount) * 100 : 0;
            const zoneColor = zone === 'Library' ? '#22c55e' : zone === 'Canteen' ? '#7c3aed' : zone === 'Hostel' ? '#f59e0b' : zone === 'Department' ? '#3b82f6' : zone === 'Ground' ? '#ec4899' : '#f97316';
            return (
              <div key={zone} className="rounded-xl p-3 transition-all" style={{
                background: count > 0 ? `linear-gradient(135deg, ${zoneColor}10, ${zoneColor}05)` : 'var(--surface)',
                border: count > 0 ? `1px solid ${zoneColor}30` : '1px solid var(--glass-border)',
              }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{ZONE_EMOJIS[zone] || '📍'}</span>
                  <span className="text-xs font-semibold text-[var(--foreground)]">{zone === 'Department' ? 'Dept' : zone}</span>
                </div>
                <p className="text-[10px] text-[var(--muted)] mb-1.5">{count} active</p>
                <div className="h-1 rounded-full bg-[var(--surface-light)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${zoneColor}, ${zoneColor}aa)`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Study SOS ─── */}
      {sosPings.length > 0 && sosPings.map(sos => {
        const act = getActivity(sos.activityId);
        const displayName = sos.isAnonymous ? 'Anonymous' : sos.userName;
        const noteText = sos.note?.replace(' [SOS]', '') || '';
        return (
          <div key={sos.id} className="rounded-2xl p-4 flex items-center gap-3 transition-all" style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
            border: '1px solid rgba(239,68,68,0.25)',
          }}>
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-sm font-bold text-red-400 shrink-0">
              SOS
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-400">Study SOS — Someone needs help!</p>
              <p className="text-[11px] text-[var(--muted)] truncate">
                {displayName} · {sos.zone}{noteText ? ` · "${noteText}"` : ''}
              </p>
            </div>
            <button
              onClick={() => handlePing(sos)}
              disabled={connectingTo === sos.id}
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50"
            >
              {connectingTo === sos.id ? '...' : 'Help →'}
            </button>
          </div>
        );
      })}

      {/* ─── Live Feed ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-green-500 to-emerald-600" />
            LIVE RIGHT NOW
          </h2>
          <span className="text-[10px] text-[var(--muted)]">{feedPings.length} broadcasting</span>
        </div>

        {feedPings.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-[var(--primary)]/10 flex items-center justify-center text-2xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
              📡
            </div>
            <p className="text-sm font-bold mb-1">Campus is quiet right now</p>
            <p className="text-xs text-[var(--muted)]">Be the first — others will join!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedPings.map(ping => {
              const act = getActivity(ping.activityId);
              const displayName = ping.isAnonymous ? 'Anonymous' : ping.userName;
              const noteText = ping.note?.replace(' [SOS]', '') || '';
              return (
                <div key={ping.id} className="card p-4 glow-hover transition-all duration-300">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-full ${getAvatarColor(displayName)} flex items-center justify-center text-white font-bold text-sm`}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--background)]" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold text-[var(--foreground)]">{displayName}</span>
                        {ping.isAnonymous && (
                          <span className="text-[10px] text-[var(--muted)] italic">· will reveal on match</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        {/* Activity badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{
                          background: (act?.color || '#7c3aed') + '18',
                          color: act?.color || '#7c3aed',
                          border: `1px solid ${(act?.color || '#7c3aed')}30`,
                        }}>
                          {act?.emoji} {act?.label || 'Activity'}
                        </span>
                        {/* Location badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--surface-light)] text-[var(--muted)] border border-[var(--glass-border)]">
                          {ZONE_EMOJIS[ping.zone] || '📍'} {ping.zone}
                        </span>
                        {/* Time */}
                        <span className="text-[10px] font-semibold text-green-400">{timeAgo(ping.createdAt)}</span>
                      </div>
                      {noteText && (
                        <p className="text-xs text-[var(--muted)] italic">&ldquo;{noteText}&rdquo;</p>
                      )}
                    </div>

                    {/* Ping button */}
                    <button
                      onClick={() => handlePing(ping)}
                      disabled={connectingTo === ping.id}
                      className="shrink-0 px-4 py-2 rounded-xl text-[11px] font-bold text-white transition-all duration-300 hover:shadow-lg active:scale-[0.97] disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, var(--primary), #6d28d9)',
                        boxShadow: '0 2px 12px rgba(124,58,237,0.3)',
                      }}
                    >
                      {connectingTo === ping.id ? '...' : '👋 Ping'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── UPDATE YOUR BROADCAST / Go Live Form ─── */}
      <div id="broadcast-form">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-[var(--primary)] to-[var(--accent)]" />
            {myPing ? 'UPDATE YOUR BROADCAST' : 'GO LIVE ON RADAR'}
          </h2>
        </div>

        <div className="card p-5 space-y-4" style={{ border: '1px solid var(--glass-border)' }}>
          {/* Activity Grid — 4 columns */}
          <div className="grid grid-cols-4 gap-2">
            {ACTIVITIES.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedActivity(a.id)}
                className={`p-3 rounded-xl text-center transition-all duration-300 ${
                  selectedActivity === a.id ? 'scale-105' : 'hover:bg-[var(--surface-light)]'
                }`}
                style={selectedActivity === a.id
                  ? { background: `linear-gradient(135deg, ${a.color}20, ${a.color}10)`, border: `2px solid ${a.color}60`, boxShadow: `0 0 16px ${a.color}20` }
                  : { background: 'var(--surface)', border: '1px solid var(--glass-border)' }
                }
              >
                <span className="text-xl block mb-1">{a.emoji}</span>
                <span className="text-[10px] font-semibold block text-[var(--foreground)]">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Custom activity input (when "Other..." is selected) */}
          {selectedActivity === 'other' && (
            <input
              value={customActivity}
              onChange={e => setCustomActivity(e.target.value)}
              placeholder="Type your activity..."
              className="input-field text-xs"
              maxLength={40}
              autoFocus
            />
          )}

          {/* Zone chips */}
          <div className="flex flex-wrap gap-2">
            {ZONES.map(z => (
              <button
                key={z}
                onClick={() => setSelectedZone(z)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                  selectedZone === z ? 'text-white' : 'text-[var(--muted)]'
                }`}
                style={selectedZone === z
                  ? { background: 'linear-gradient(135deg, var(--primary), #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }
                  : { background: 'var(--surface)', border: '1px solid var(--glass-border)' }
                }
              >
                {ZONE_EMOJIS[z] || '📍'} {z}
              </button>
            ))}
          </div>

          {/* Quick note */}
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Quick note (e.g., 'beginner friendly, working on graphs')"
            className="input-field text-xs"
            maxLength={100}
          />

          {/* Anonymous + SOS row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnon}
                  onChange={e => setIsAnon(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] accent-[var(--primary)]"
                />
                <span className="text-xs text-[var(--muted)]">Stay anonymous</span>
              </label>
              <button
                onClick={() => setIsSOS(!isSOS)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  isSOS
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-[var(--surface-light)] text-[var(--muted)] border border-[var(--glass-border)]'
                }`}
              >
                🆘 SOS
              </button>
            </div>
          </div>

          {/* Go Live button */}
          <button
            onClick={handleBroadcast}
            disabled={!selectedActivity || broadcasting}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold transition-all duration-300 disabled:opacity-40 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, var(--primary), #6d28d9, var(--accent))',
              backgroundSize: '200% 200%',
              animation: 'gradientShift 3s ease infinite',
              boxShadow: '0 4px 24px rgba(124, 58, 237, 0.4)',
            }}
          >
            {broadcasting ? 'Going live...' : myPing ? 'Update Broadcast →' : 'Go Live →'}
          </button>
          <p className="text-[10px] text-[var(--muted)] text-center">Expires in 2 hours automatically</p>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="text-center py-4">
        <p className="text-[10px] text-[var(--muted)]">
          Broadcasts expire automatically · Only your campus can see this
        </p>
      </div>

      <style jsx>{`
        .radar-polish { z-index: 1; }
        .radar-aura {
          position: absolute; pointer-events: none; border-radius: 999px;
          filter: blur(52px); opacity: 0.12; z-index: 0;
        }
        .radar-aura-1 { width: 260px; height: 190px; right: -90px; top: 110px; background: rgba(99, 102, 241, 0.34); }
        .radar-aura-2 { width: 220px; height: 170px; left: -70px; top: 300px; background: rgba(34, 197, 94, 0.2); }
        @media (max-width: 640px) { .radar-aura { opacity: 0.08; } }
        @media (prefers-reduced-motion: reduce) { .radar-aura { display: none; } }
      `}</style>
    </div>
  );
}
