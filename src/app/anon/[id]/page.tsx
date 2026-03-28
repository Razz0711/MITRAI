// ============================================
// MitrRAI - Anonymous Chat Room Page
// WhatsApp-style rewrite: 100dvh, flex layout,
// React.memo bubbles, textarea, smart scroll
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { ROOM_TYPES } from '@/lib/anon-aliases';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useChatStability } from '@/hooks/useChatStability';
import { useChatScroll } from '@/hooks/useChatScroll';
import { ArrowLeft, Send, MoreVertical } from 'lucide-react';

interface AnonMsg {
  id: string;
  roomId: string;
  senderId: string;
  alias: string;
  text: string;
  createdAt: string;
}

interface RoomData {
  room: { id: string; roomType: string; status: string; createdAt: string };
  myAlias: string;
  myRevealConsent: boolean;
  partnerAlias: string;
  partnerRevealConsent: boolean;
  partnerRealInfo: { name?: string; department?: string } | null;
  messages: AnonMsg[];
  messageCount: number;
}

/* ─── Memoized Message Bubble ─── */
const AnonBubble = memo(function AnonBubble({
  msg, isMe,
}: {
  msg: AnonMsg;
  isMe: boolean;
}) {
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 ${isMe ? 'msg-sent' : 'msg-received'}`}>
      <div
        style={{ maxWidth: '75%', wordBreak: 'break-word', overflowWrap: 'break-word' }}
      >
        {/* Alias label */}
        <div className={`text-[11px] mb-0.5 ${isMe ? 'text-right text-[var(--primary-light)]' : 'text-left text-[var(--primary-light)]'}`}>
          {msg.alias}
        </div>
        {/* Bubble */}
        <div
          className="px-3 py-2 whitespace-pre-wrap"
          style={{
            background: isMe ? 'var(--primary)' : 'var(--surface-light)',
            color: '#fff',
            fontSize: '14px',
            lineHeight: '1.45',
            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          }}
        >
          {msg.text}
          <div className={`flex items-center mt-1 ${isMe ? 'justify-end' : ''}`}>
            <span style={{ fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.65)' }}>
              {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function AnonChatRoomPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const { play: playSound } = useNotificationSound();
  useChatStability();


  /* ─── visualViewport keyboard handler ─── */
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleResize = () => {
      const root = document.getElementById('chat-root');
      if (!root) return;
      root.style.height = viewport.height + 'px';
      root.style.top = viewport.offsetTop + 'px';
    };
    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);
    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  const [data, setData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<AnonMsg[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showReveal, setShowReveal] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState('');
  const [closed, setClosed] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const closingByMe = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { containerRef, bottomRef, forceScrollToBottom, handleScroll, userAtBottom } = useChatScroll([messages, sending]);

  // Load room data
  const loadRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/anon/${roomId}`);
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Room not found'); return; }
      setData(json.data);
      setMessages(json.data.messages);
      if (json.data.room.status === 'closed') setClosed(true);
    } catch { setError('Failed to load room'); }
  }, [roomId]);

  useEffect(() => {
    if (!user) return;
    loadRoom();
  }, [user, loadRoom]);

  // Realtime subscription — new messages + room status changes
  useEffect(() => {
    if (!roomId) return;
    const channel = supabaseBrowser
      .channel(`anon-room-${roomId}`)
      // Listen for new messages
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'anon_messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        const row = payload.new;
        const msg: AnonMsg = { id: row.id, roomId: row.room_id, senderId: row.sender_id, alias: row.alias, text: row.text, createdAt: row.created_at };
        if (msg.senderId !== user?.id) playSound('message');
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          const oi = prev.findIndex(m => m.id.startsWith('optimistic_') && m.senderId === msg.senderId && m.text === msg.text);
          if (oi >= 0) { const u = [...prev]; u[oi] = msg; return u; }
          return [...prev, msg];
        });
      })
      // Listen for room status → 'closed' (partner left)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'anon_rooms', filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.new?.status === 'closed' && !closingByMe.current) {
          setMessages([]);
          setClosed(true);
          setPartnerLeft(true);
          let c = 4;
          setCountdown(c);
          const t = setInterval(() => {
            c -= 1;
            setCountdown(c);
            if (c <= 0) { clearInterval(t); router.push('/anon'); }
          }, 1000);
        }
      })
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [playSound, roomId, router, user?.id]);


  // Initial scroll
  useEffect(() => { setTimeout(() => forceScrollToBottom('instant'), 150); }, [forceScrollToBottom]);

  const sendMessage = async () => {
    if (!newMsg.trim() || sending || !data) return;
    const text = newMsg.trim();
    setSending(true);
    setNewMsg('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';
    userAtBottom.current = true;

    const optimisticMsg: AnonMsg = { id: `optimistic_${Date.now()}`, roomId, senderId: user!.id, alias: data.myAlias, text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'message', text }) });
      const json = await res.json();
      if (json.success && json.data) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...json.data, roomId: json.data.roomId || roomId } : m));
      }
    } catch { /* optimistic stays */ }
    setSending(false);
  };

  const handleReveal = async () => {
    const res = await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reveal' }) });
    const json = await res.json();
    if (json.success) { setShowReveal(false); loadRoom(); }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'report', reason: reportReason.trim() }) });
    setShowReport(false); setReportReason('');
  };

  const handleBlock = async () => {
    await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'block' }) });
    setShowBlockConfirm(false); setClosed(true);
  };

  const handleClose = async () => {
    closingByMe.current = true;
    await fetch(`/api/anon/${roomId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'close' }) });
    setClosed(true);
    router.push('/anon');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  /* ─── Textarea auto-resize ─── */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMsg(e.target.value);
    const ta = e.target;
    ta.style.height = '40px';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><p className="text-white/40">Please log in</p></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center flex-col gap-4"><p className="text-red-400">{error}</p><button onClick={() => router.push('/anon')} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm">Back to Lobby</button></div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  const roomType = ROOM_TYPES.find(r => r.id === data.room.roomType);
  const isRevealed = data.room.status === 'revealed';
  const canReveal = messages.length >= 10 && !isRevealed;

  // ── Category-specific chat backgrounds ──────────────────────────────────
  const CHAT_BACKGROUNDS: Record<string, { gradient: string; pattern: string }> = {
    crush: {
      gradient: 'radial-gradient(ellipse at 20% 80%, rgba(236,72,153,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(251,113,133,0.1) 0%, transparent 60%)',
      pattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 20 C30 20 20 10 15 16 C10 22 20 28 30 36 C40 28 50 22 45 16 C40 10 30 20 30 20Z' fill='rgba(236,72,153,0.06)' /%3E%3C/svg%3E")`,
    },
    career: {
      gradient: 'radial-gradient(ellipse at 0% 100%, rgba(245,158,11,0.1) 0%, transparent 60%), radial-gradient(ellipse at 100% 0%, rgba(251,191,36,0.07) 0%, transparent 60%)',
      pattern: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='40' height='40' fill='none'/%3E%3Cpath d='M0 40 L40 0' stroke='rgba(245,158,11,0.05)' stroke-width='1'/%3E%3Cpath d='M-40 40 L0 0' stroke='rgba(245,158,11,0.05)' stroke-width='1'/%3E%3Cpath d='M40 40 L80 0' stroke='rgba(245,158,11,0.05)' stroke-width='1'/%3E%3C/svg%3E")`,
    },
    vent: {
      gradient: 'radial-gradient(ellipse at 30% 70%, rgba(99,102,241,0.1) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(139,92,246,0.08) 0%, transparent 60%)',
      pattern: `url("data:image/svg+xml,%3Csvg width='80' height='40' viewBox='0 0 80 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 Q20 5 40 20 Q60 35 80 20' fill='none' stroke='rgba(99,102,241,0.07)' stroke-width='1.5'/%3E%3C/svg%3E")`,
    },
    confession: {
      gradient: 'radial-gradient(ellipse at 50% 50%, rgba(124,58,237,0.1) 0%, transparent 70%)',
      pattern: `url("data:image/svg+xml,%3Csvg width='30' height='30' viewBox='0 0 30 30' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='15' cy='15' r='1.5' fill='rgba(167,139,250,0.12)'/%3E%3C/svg%3E")`,
    },
    night_owl: {
      gradient: 'radial-gradient(ellipse at 80% 20%, rgba(30,27,75,0.6) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(49,46,129,0.4) 0%, transparent 50%)',
      pattern: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='15' r='1.2' fill='rgba(255,255,255,0.18)'/%3E%3Ccircle cx='65' cy='35' r='0.8' fill='rgba(255,255,255,0.14)'/%3E%3Ccircle cx='80' cy='70' r='1.5' fill='rgba(255,255,255,0.2)'/%3E%3Ccircle cx='35' cy='80' r='0.9' fill='rgba(255,255,255,0.12)'/%3E%3Ccircle cx='50' cy='55' r='0.6' fill='rgba(255,255,255,0.1)'/%3E%3Ccircle cx='90' cy='10' r='1' fill='rgba(255,255,255,0.16)'/%3E%3C/svg%3E")`,
    },
    radar: {
      gradient: 'radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 70%)',
      pattern: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='30' fill='none' stroke='rgba(16,185,129,0.06)' stroke-width='1'/%3E%3Ccircle cx='40' cy='40' r='20' fill='none' stroke='rgba(16,185,129,0.05)' stroke-width='1'/%3E%3Ccircle cx='40' cy='40' r='10' fill='none' stroke='rgba(16,185,129,0.04)' stroke-width='1'/%3E%3C/svg%3E")`,
    },
  };
  const bg = CHAT_BACKGROUNDS[data.room.roomType] || CHAT_BACKGROUNDS.vent;


  return (
    <div id="chat-root" className="flex flex-col" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--background)', overflow: 'hidden' }}>

      {/* ─── Partner Left Popup ─── */}
      {partnerLeft && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: 32,
        }}>
          <div style={{ fontSize: 56 }}>💨</div>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', textAlign: 'center' }}>
            Partner left the chat
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 }}>
            All messages have been deleted. Your conversation is gone forever.
          </p>
          {/* Countdown circle */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '3px solid rgba(139,92,246,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#a78bfa',
          }}>
            {countdown}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Returning to lobby…</p>
          <button
            onClick={() => router.push('/anon')}
            style={{ marginTop: 8, padding: '12px 28px', borderRadius: 20, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Go Back Now
          </button>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)', paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)' }}>
        <button onClick={handleClose} className="p-1 -ml-1 text-white hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg`} style={{ background: roomType?.color || 'var(--primary)' }}>
            {roomType?.label?.charAt(0) || 'R'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-semibold text-white truncate leading-tight flex items-center gap-2">
            {roomType?.label}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${closed ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className="text-[11px] text-green-400">
              {closed ? 'Chat closed' : 'Online'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canReveal && (
            <button onClick={() => setShowReveal(true)} className="text-[11px] px-2 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors">
              {data.myRevealConsent ? '✓ Reveal sent' : 'Reveal'}
            </button>
          )}
          {isRevealed && <span className="text-[11px] px-2 py-1 rounded-lg bg-green-500/20 text-green-400">✓ Revealed</span>}
          {/* Exit button */}
          <button
            onClick={handleClose}
            className="text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            Exit
          </button>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-xl text-white/65 hover:text-white transition-colors">
              <MoreVertical size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-2xl z-50 overflow-hidden" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
                <button onClick={() => { setShowMenu(false); setShowReport(true); }} className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/[0.04] transition-colors">Report User</button>
                <button onClick={() => { setShowMenu(false); setShowBlockConfirm(true); }} className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/[0.06]">Block & Leave</button>
                <button onClick={() => { setShowMenu(false); handleClose(); }} className="w-full px-4 py-3 text-left text-sm text-white/50 hover:bg-white/[0.04] transition-colors border-t border-white/[0.06]">Leave Chat</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-3" style={{ overscrollBehavior: 'contain', background: bg.gradient, backgroundImage: `${bg.gradient.includes('url') ? '' : ''}, ${bg.pattern}` }}>
        {/* Background overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: bg.gradient, backgroundImage: bg.pattern }} />
        <div style={{ position: 'relative', zIndex: 1 }}>

        {/* System message */}
        <div className="text-center py-3 mb-2">
          <p className="text-[11px] text-white/65 inline-block px-3 py-1 rounded-full" style={{ background: 'var(--surface)' }}>
            {roomType?.label} — Chat started. Be kind & respectful.
          </p>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderId === user.id;
          return <AnonBubble key={msg.id} msg={msg} isMe={isMe} />;
        })}

        {closed && (
          <div className="text-center py-6 px-4">
            <p className="text-xs text-red-400 inline-block px-3 py-1.5 rounded-full mb-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              💨 Partner left · Messages deleted
            </p>
            <p className="text-[11px] text-white/30 mb-3">Redirecting to lobby…</p>
            <button onClick={() => router.push('/anon')} className="block mx-auto px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold">Back to Lobby</button>
          </div>
        )}

        <div ref={bottomRef} />
        </div>{/* end relative z-1 wrapper */}
      </div>

      {/* ─── Input Bar ─── */}
      {!closed && (
        <div className="shrink-0 flex items-end gap-2 px-3 py-2" style={{ background: 'var(--glass-bg)', borderTop: '1px solid var(--glass-border)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
          <textarea
            ref={textareaRef}
            value={newMsg}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={1000}
            rows={1}
            disabled={sending}
            className="flex-1 resize-none text-[var(--foreground)] text-[15px] placeholder:text-[var(--muted)] rounded-[20px] px-4 py-2.5 outline-none tracking-tight transition-colors disabled:opacity-50"
            style={{ background: 'var(--surface-light)', border: '1px solid var(--border)', minHeight: '40px', maxHeight: '160px', lineHeight: '1.4' }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMsg.trim() || sending}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:scale-100"
            style={{ background: 'var(--primary)' }}
          >
            <Send size={18} className="text-white ml-0.5" />
          </button>
        </div>
      )}

      {/* ─── Block Confirmation ─── */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
            <h3 className="text-lg font-bold text-white mb-2">Block User</h3>
            <p className="text-sm text-white/40 mb-4">Are you sure? This will close the chat and they won&apos;t be matched with you again.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/8">Cancel</button>
              <button onClick={handleBlock} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white">Block</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reveal Modal ─── */}
      {showReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
            <h3 className="text-lg font-bold text-white mb-2">Reveal Identity</h3>
            <p className="text-sm text-white/40 mb-4">Both must consent. Once both agree, real names are shown. 10+ messages required.</p>
            <div className="flex items-center gap-3 mb-4 text-sm">
              <div className={`px-3 py-1 rounded-full text-xs ${data.myRevealConsent ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'}`}>
                You: {data.myRevealConsent ? '✓ Ready' : 'Not yet'}
              </div>
              <div className={`px-3 py-1 rounded-full text-xs ${data.partnerRevealConsent ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'}`}>
                Partner: {data.partnerRevealConsent ? '✓ Ready' : 'Not yet'}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReveal(false)} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/8">Cancel</button>
              <button onClick={handleReveal} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white">
                {data.myRevealConsent ? 'Withdraw Consent' : 'I Agree to Reveal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Report Modal ─── */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)' }}>
            <h3 className="text-lg font-bold text-white mb-2">Report User</h3>
            <p className="text-sm text-white/40 mb-4">Help keep the community safe. False reports may result in your own ban.</p>
            <select
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-[var(--foreground)] text-sm mb-4" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)' }}
            >
              <option value="">Select a reason...</option>
              <option value="harassment">Harassment or bullying</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="spam">Spam or ads</option>
              <option value="threats">Threats or violence</option>
              <option value="doxxing">Trying to identify me</option>
              <option value="other">Other</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => { setShowReport(false); setReportReason(''); }} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/8">Cancel</button>
              <button onClick={handleReport} disabled={!reportReason} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white disabled:opacity-40">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
