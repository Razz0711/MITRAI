// ============================================
// MitrRAI - Single Room Page (chat + members + call)
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Send, Users, ArrowLeft } from 'lucide-react';
import { useChatStability } from '@/hooks/useChatStability';

interface RoomMsg {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

interface RoomMember {
  userId: string;
  userName: string;
  role: string;
  joinedAt: string;
}

interface Room {
  id: string;
  name: string;
  topic: string;
  description: string;
  creatorId: string;
  maxMembers: number;
  status: string;
}

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useChatStability();

  const myName = user?.email?.split('@')[0] || 'Student';

  const loadRoom = useCallback(async () => {
    if (!user || !id) return;
    try {
      const res = await fetch(`/api/rooms/${id}`);
      const data = await res.json();
      if (data.success) {
        setRoom(data.data.room);
        setMembers(data.data.members || []);
        setMessages(data.data.messages || []);
        setIsMember(
          (data.data.members || []).some((m: RoomMember) => m.userId === user.id)
        );
      }
    } catch (err) {
      console.error('loadRoom:', err);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (isMember) {
      pollRef.current = setInterval(loadRoom, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isMember, loadRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', userId: user.id, userName: myName }),
      });
      const data = await res.json();
      if (data.success) await loadRoom();
    } catch (err) {
      console.error('joinRoom:', err);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    try {
      await fetch(`/api/rooms/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', userId: user.id }),
      });
      await loadRoom();
    } catch (err) {
      console.error('leaveRoom:', err);
    }
  };

  const handleSend = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/rooms/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          userId: user.id,
          userName: myName,
          text: text.trim(),
        }),
      });
      setText('');
      await loadRoom();
    } catch (err) {
      console.error('sendMessage:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (!room) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-[var(--muted)] text-lg">Room not found.</p>
        <Link href="/rooms" className="text-[var(--primary-light)] hover:underline">← Back to Rooms</Link>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--background)',
      }}
    >
      {/* ─── Header ─── */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2.5"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <Link href="/rooms" className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-[var(--foreground)] truncate leading-tight">{room.name}</h1>
          {room.topic && <p className="text-[11px] text-[var(--muted-strong)] truncate">{room.topic}</p>}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
          room.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-white/8 text-[var(--muted)]'
        }`}>● {room.status}</span>
        {isMember && (
          <button
            onClick={handleLeave}
            className="text-[11px] font-semibold text-red-400 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15 shrink-0"
          >
            Leave
          </button>
        )}
        <button
          onClick={() => setShowMembersDrawer(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[var(--muted-strong)] text-[11px] font-medium shrink-0"
          style={{ background: 'var(--surface-light)' }}
        >
          <Users size={13} /> {members.length}
        </button>
      </div>

      {/* ─── Messages ─── */}
      {isMember ? (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1" style={{ overscrollBehavior: 'contain' }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-2xl">💬</div>
                <p className="text-sm text-[var(--muted-strong)]">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 animate-appear`}>
                    <div className="px-3 py-2" style={{
                      maxWidth: '75%',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      background: isMe ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      fontSize: '14px',
                      lineHeight: '1.45',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    }}>
                      {!isMe && <p className="text-[11px] font-semibold text-purple-400 mb-0.5">{msg.senderName}</p>}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <p className="mt-1" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── Input bar ─── */}
          <div
            className="shrink-0 flex items-end gap-2 px-3 py-2"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTop: '1px solid var(--glass-border)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
            }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => {
                setText(e.target.value);
                const ta = e.target;
                ta.style.height = '40px';
                ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none text-white text-[15px] placeholder:text-white/35 rounded-[20px] px-4 py-2.5 outline-none transition-colors"
              style={{ minHeight: '40px', maxHeight: '160px', lineHeight: '1.4', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white transition-all active:scale-90 disabled:opacity-30"
              style={{ background: 'var(--primary)' }}
            >
              <Send size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl">🔒</div>
          <div>
            <p className="text-[var(--foreground)] font-semibold mb-1">Join to chat</p>
            <p className="text-sm text-[var(--muted-strong)]">{members.length}/{room.maxMembers} members</p>
          </div>
          <button
            onClick={handleJoin}
            disabled={joining}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-[var(--primary)]/20"
            style={{ background: 'var(--primary)' }}
          >
            {joining ? 'Joining...' : 'Join Room'}
          </button>
        </div>
      )}

      {/* Members Drawer */}
      {showMembersDrawer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowMembersDrawer(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" style={{ background: 'var(--surface-solid)', borderTop: '1px solid var(--glass-border)' }}>
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
            <h2 className="font-bold text-[var(--foreground)] mb-3 text-base">Members ({members.length}/{room.maxMembers})</h2>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary-light)] font-bold text-sm shrink-0">
                    {m.userName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {m.userName}{m.userId === user?.id && <span className="text-xs text-[var(--muted-strong)] ml-1">(you)</span>}
                    </p>
                    {m.role === 'creator' && <p className="text-[10px] text-amber-400">Creator</p>}
                  </div>
                </div>
              ))}
            </div>
            {room.description && (
              <div className="mt-4 pt-4 border-t border-white/8">
                <p className="text-[11px] uppercase text-[var(--muted-strong)] mb-1 font-bold tracking-wider">About</p>
                <p className="text-sm text-[var(--muted-strong)]">{room.description}</p>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
