// ============================================
// MitrRAI - Circle Detail Page
// Tabs: Rooms | Chat | Members
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Users, MessageCircle, ArrowLeft, Send, ChevronUp } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

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

interface CircleMessage {
  id: string;
  circleId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

/* ── helpers ── */
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dateSeparator(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function msgFromPayload(p: Record<string, unknown>): CircleMessage {
  return {
    id: p.id as string,
    circleId: p.circle_id as string,
    senderId: p.sender_id as string,
    senderName: p.sender_name as string,
    text: p.text as string,
    createdAt: p.created_at as string,
  };
}

/* ── Initials avatar ── */
function Avatar({ name, color, size = 8 }: { name: string; color: string; size?: number }) {
  const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

/* ─────────────────────────── CircleChat ─────────────────────────── */
function CircleChat({
  circleId,
  circleColor,
  circleEmoji,
  userId,
  isMember,
}: {
  circleId: string;
  circleColor: string;
  circleEmoji: string;
  userId: string;
  isMember: boolean;
}) {
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set<string>());

  const addMsg = useCallback((msg: CircleMessage) => {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages(prev => [...prev, msg]);
  }, []);

  const loadMessages = useCallback(async (before?: string) => {
    if (before) setLoadingMore(true);
    else setLoading(true);
    try {
      const url = `/api/circles/${circleId}/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const msgs: CircleMessage[] = data.messages;
        msgs.forEach(m => seenIds.current.add(m.id));
        if (before) {
          setMessages(prev => [...msgs, ...prev]);
        } else {
          setMessages(msgs);
          setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
        }
        setHasMore(msgs.length >= 30);
      }
    } finally {
      if (before) setLoadingMore(false);
      else setLoading(false);
    }
  }, [circleId]);

  // Initial load + realtime subscription
  useEffect(() => {
    loadMessages();
    const channel = supabaseBrowser
      .channel(`circle_chat_${circleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'circle_messages', filter: `circle_id=eq.${circleId}` },
        (payload) => {
          const msg = msgFromPayload(payload.new as Record<string, unknown>);
          addMsg(msg);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        },
      )
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [circleId, loadMessages, addMsg]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText('');
    const res = await fetch(`/api/circles/${circleId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t }),
    });
    const data = await res.json();
    if (data.success) {
      addMsg(data.message);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
    setSending(false);
  };

  // Show date separator between messages from different days
  const grouped: { sep?: string; msg: CircleMessage }[] = [];
  let lastDate = '';
  messages.forEach(m => {
    const d = new Date(m.createdAt).toDateString();
    if (d !== lastDate) { grouped.push({ sep: dateSeparator(m.createdAt), msg: m }); lastDate = d; }
    else grouped.push({ msg: m });
  });

  // Subtle dot-grid background using circle color
  const chatBg = {
    backgroundImage: `radial-gradient(circle at 1px 1px, ${circleColor}18 1px, transparent 0)`,
    backgroundSize: '22px 22px',
    backgroundColor: 'var(--background)',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="text-3xl animate-pulse">{circleEmoji}</span>
        <p className="text-sm text-[var(--muted-strong)]">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: 360 }}>
      {/* Message area */}
      <div className="flex-1 overflow-y-auto rounded-xl p-3 space-y-1" style={chatBg}>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pb-2">
            <button
              onClick={() => messages.length > 0 && loadMessages(messages[0].createdAt)}
              disabled={loadingMore}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
              style={{ background: `${circleColor}22`, color: circleColor, border: `1px solid ${circleColor}44` }}
            >
              <ChevronUp size={12} />
              {loadingMore ? 'Loading...' : 'Load older'}
            </button>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <span className="text-5xl">{circleEmoji}</span>
            <p className="text-sm font-medium text-[var(--foreground)]">No messages yet</p>
            <p className="text-xs text-[var(--muted-strong)]">Be the first to say something!</p>
          </div>
        )}

        {/* Messages */}
        {grouped.map(({ sep, msg }, i) => {
          const isMe = msg.senderId === userId;
          return (
            <div key={`${sep ?? ''}_${msg.id}_${i}`}>
              {/* Date separator */}
              {sep && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px" style={{ background: `${circleColor}30` }} />
                  <span className="text-[10px] px-2 py-0.5 rounded-full text-[var(--muted-strong)]"
                    style={{ background: `${circleColor}18`, border: `1px solid ${circleColor}30` }}>
                    {sep}
                  </span>
                  <div className="flex-1 h-px" style={{ background: `${circleColor}30` }} />
                </div>
              )}

              {/* Message bubble */}
              <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar (others only) */}
                {!isMe && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 mb-1"
                    style={{ backgroundColor: circleColor }}
                  >
                    {msg.senderName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}

                <div className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender name (others only) */}
                  {!isMe && (
                    <span className="text-[10px] font-semibold ml-1" style={{ color: circleColor }}>
                      {msg.senderName}
                    </span>
                  )}

                  {/* Bubble */}
                  <div
                    className="px-3 py-2 text-sm leading-relaxed break-words"
                    style={isMe ? {
                      background: `linear-gradient(135deg, ${circleColor}dd, ${circleColor})`,
                      color: 'white',
                      borderRadius: '18px 18px 4px 18px',
                      boxShadow: `0 2px 12px ${circleColor}40`,
                    } : {
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      color: 'var(--foreground)',
                      borderRadius: '18px 18px 18px 4px',
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Timestamp */}
                  <span className={`text-[10px] text-[var(--muted-strong)] px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {isMember ? (
        <div className="pt-3">
          <div
            className="flex items-center gap-2 rounded-2xl px-3 py-2"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${circleColor}40` }}
          >
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Message ${circleEmoji}...`}
              maxLength={1000}
              className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-strong)] outline-none"
            />
            <button
              onClick={send}
              disabled={!text.trim() || sending}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
              style={{ background: circleColor }}
            >
              <Send size={14} color="white" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className="mt-3 text-center text-sm py-3 rounded-xl"
          style={{ background: `${circleColor}10`, border: `1px solid ${circleColor}30`, color: circleColor }}
        >
          Join this circle to send messages
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Main Page ─────────────────────────── */
export default function CircleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rooms' | 'chat' | 'members'>('rooms');

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
            (m: Member) => m.userId === user.id,
          ),
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
      if (data.success) await loadCircle();
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
        <p className="text-[var(--muted-strong)] text-lg mb-2">Circle not found.</p>
        <Link href="/circles" className="text-[var(--primary-light)] hover:underline">
          ← Back to Circles
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: 'rooms' as const, label: '🎙️ Rooms' },
    { key: 'chat' as const, label: '💬 Chat' },
    { key: 'members' as const, label: '👥 Members' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
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
            <p className="text-sm text-[var(--muted-strong)] ml-12">{circle.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 ml-12 text-xs text-[var(--muted-strong)]">
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

      {/* Tab bar */}
      <div className="flex border-b border-white/10 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.key
                ? 'text-[var(--foreground)]'
                : 'text-[var(--muted-strong)] border-transparent hover:text-[var(--foreground)]'
            }`}
            style={activeTab === tab.key ? { borderColor: circle.color, color: circle.color } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Rooms tab ── */}
      {activeTab === 'rooms' && (
        <section>
          {rooms.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-3xl mb-2">📚</p>
              <p className="text-sm text-[var(--muted-strong)]">No active rooms in this circle yet.</p>
              <Link
                href="/rooms"
                className="inline-block mt-3 text-xs hover:underline"
                style={{ color: circle.color }}
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
                          : 'bg-[var(--surface-light)] text-[var(--muted-strong)]'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>
                  {room.topic && (
                    <p className="text-xs text-[var(--muted-strong)] mb-1">📌 {room.topic}</p>
                  )}
                  {room.description && (
                    <p className="text-xs text-[var(--muted-strong)] line-clamp-2">{room.description}</p>
                  )}
                  <p className="text-[11px] text-[var(--muted-strong)] mt-2">
                    Max {room.maxMembers} members
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Chat tab ── */}
      {activeTab === 'chat' && user && (
        <CircleChat
          circleId={circle.id}
          circleColor={circle.color}
          circleEmoji={circle.emoji}
          userId={user.id}
          isMember={isMember}
        />
      )}

      {/* ── Members tab ── */}
      {activeTab === 'members' && (
        <section>
          {members.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-sm text-[var(--muted-strong)]">No members yet. Be the first to join!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((m) => (
                <div key={m.userId} className="card p-3 flex items-center gap-3">
                  <Avatar name={m.name} color={circle.color} size={9} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {m.name}
                      {m.userId === user?.id && (
                        <span className="text-[11px] text-[var(--muted-strong)] ml-1">(you)</span>
                      )}
                    </p>
                    {m.department && (
                      <p className="text-[11px] text-[var(--muted-strong)] truncate">{m.department}</p>
                    )}
                  </div>
                  {m.joinedAt && (
                    <span className="text-[11px] text-[var(--muted-strong)] shrink-0">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
