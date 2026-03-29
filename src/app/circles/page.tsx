// ============================================
// MitrRAI - Circles Page (Discord Model Redesign)
// Circle = community, Room = live session inside
// Left: circle list | Right: circle detail + rooms
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Search, ArrowLeft, Send, Paperclip, Image as ImageIcon, FileText, BarChart3, X, Download } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface CircleMessage {
  id: string;
  circleId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'image' | 'document' | 'poll';
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Circle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

interface Membership {
  circleId: string;
  userId?: string;
  createdAt: string;
}

interface StudyRoom {
  id: string;
  name: string;
  topic: string;
  description: string;
  circleId: string;
  creatorId: string;
  creatorName: string;
  maxMembers: number;
  status: string;
  createdAt: string;
}

/* ─── Avatar color helper ─── */
const AVATAR_COLORS = ['bg-violet-600','bg-emerald-600','bg-blue-600','bg-pink-600','bg-amber-600','bg-cyan-600','bg-indigo-600','bg-rose-600'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ─── Themed chat background based on circle name/description ─── */
function getChatTheme(name: string, desc: string, color: string) {
  const text = `${name} ${desc}`.toLowerCase();
  let icons = '💬 ✨ 🌟';
  if (/fitness|gym|health|workout|exercise/.test(text)) icons = '💪 🏋️ 🧘 ❤️ 🏃';
  else if (/cod|program|dev|tech|software|dsa|algo|hack/.test(text)) icons = '💻 ⚡ { } 🔧 01';
  else if (/blog|writ|read|book|liter|poem|story/.test(text)) icons = '✍️ 📖 📝 ✒️ 📚';
  else if (/music|song|sing|guitar|piano|band/.test(text)) icons = '🎵 🎸 🎤 🎶 🎧';
  else if (/art|design|paint|draw|sketch|creat/.test(text)) icons = '🎨 🖌️ ✏️ 🖼️ 🌈';
  else if (/game|esport|play|chess|puzzle/.test(text)) icons = '🎮 🕹️ ♟️ 🏆 🎯';
  else if (/science|physics|chem|bio|math|research/.test(text)) icons = '🔬 🧪 📐 🧬 ⚛️';
  else if (/food|cook|recipe|bake|kitchen|eat/.test(text)) icons = '🍳 🧁 🍕 🥗 👨‍🍳';
  else if (/travel|explore|adventure|trip|wander/.test(text)) icons = '✈️ 🌍 🗺️ 🏔️ 🧳';
  else if (/photo|camera|film|video|cinema/.test(text)) icons = '📷 🎬 🎥 🌄 📸';
  else if (/business|startup|entrepreneur|market|finance/.test(text)) icons = '📈 💼 🚀 💡 📊';
  else if (/mental|meditat|mindful|well|self/.test(text)) icons = '🧘 🌸 🕊️ 💭 🌿';

  const svgIcons = icons.split(' ').map((icon, i) => {
    const x = (i * 23 + 7) % 100;
    const y = (i * 37 + 13) % 100;
    return `<text x="${x}%" y="${y}%" font-size="14" opacity="0.06">${icon}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">${svgIcons}</svg>`;
  const encoded = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(svg))) : '';
  return {
    background: `
      radial-gradient(ellipse 80% 50% at 50% 0%, ${color}12 0%, transparent 60%),
      radial-gradient(circle at 1px 1px, ${color}15 1px, transparent 0)${encoded ? `,
      url("data:image/svg+xml;base64,${encoded}")` : ''},
      var(--surface)
    `,
    backgroundSize: `100% 100%, 20px 20px${encoded ? ', 200px 200px' : ''}, 100% 100%`,
  };
}

/* ─── Circle Chat Component ─── */
function CircleChat({ circle }: { circle: Circle }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollVotes, setPollVotes] = useState<Record<string, { userId: string; optionIndex: number }[]>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  
  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 80);
  };

  const loadMessages = useCallback(async (isInitial = true) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const before = isInitial || messages.length === 0 ? undefined : messages[0].createdAt;
      const url = `/api/circles/${circle.id}/messages${before ? `?before=${encodeURIComponent(before)}&limit=50` : '?limit=50'}`;
      const res = await fetch(url);
      const result = await res.json();
      const data: CircleMessage[] = result.success ? (result.messages || []) : [];
      if (data.length < 50) setHasMore(false);
      
      if (isInitial) {
        setMessages(data);
        scrollToBottom();
      } else {
        const el = scrollRef.current;
        const oldHeight = el ? el.scrollHeight : 0;
        setMessages(prev => [...data, ...prev]);
        if (el) setTimeout(() => { el.scrollTop = el.scrollHeight - oldHeight; }, 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [circle.id, messages]);

  useEffect(() => {
    setMessages([]);
    setHasMore(true);
    loadMessages(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circle.id]);

  useEffect(() => {
    const channel = supabaseBrowser.channel(`circle_messages_${circle.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'circle_messages', filter: `circle_id=eq.${circle.id}` },
        (payload) => {
          const newMsg: CircleMessage = {
            id: payload.new.id,
            circleId: payload.new.circle_id,
            senderId: payload.new.sender_id,
            senderName: payload.new.sender_name,
            text: payload.new.text,
            type: payload.new.type || 'text',
            metadata: payload.new.metadata || null,
            createdAt: payload.new.created_at,
          };
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      )
      .subscribe();
      
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [circle.id]);

  const addMsg = (msg: CircleMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    scrollToBottom();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;
    const text = inputText.trim();
    setInputText('');
    
    // Optimistic: add msg immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: CircleMessage = {
      id: tempId,
      circleId: circle.id,
      senderId: user.id,
      senderName: user.name || user.email?.split('@')[0] || 'You',
      text,
      type: 'text',
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const res = await fetch(`/api/circles/${circle.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        // Replace temp msg with real one
        setMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
      } else {
        console.error('Message API error:', data.error || data);
        // Show error visually - mark the temp msg as failed
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: `${text} ⚠️ (failed to send)` } : m));
      }
    } catch (err) {
      console.error('sendCircleMessage network error:', err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: `${text} ⚠️ (network error)` } : m));
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'document') => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large (5MB max)'); return; }
    setUploading(true);
    setShowAttach(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const res = await fetch(`/api/circles/${circle.id}/messages`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.message) addMsg(data.message);
      else loadMessages(true);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!user) return;
    const q = pollQuestion.trim();
    const opts = pollOptions.map(o => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;
    setShowPollForm(false);
    setShowAttach(false);
    try {
      const res = await fetch(`/api/circles/${circle.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'poll', question: q, options: opts }),
      });
      const data = await res.json();
      if (data.success && data.message) addMsg(data.message);
      else loadMessages(true);
    } catch (err) {
      console.error('Poll creation error:', err);
    }
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleVote = async (messageId: string, optionIndex: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/circles/${circle.id}/messages/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, optionIndex }),
      });
      const data = await res.json();
      if (data.success) {
        setPollVotes(prev => ({ ...prev, [messageId]: data.votes }));
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
  };
  
  const handleScroll = () => {
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollTop === 0 && hasMore && !loadingMore && !loading) {
      loadMessages(false);
    }
  };

  /* ── render a single message bubble ── */
  const renderMessage = (m: CircleMessage, isMe: boolean): React.ReactNode => {
    const msgType = m.type || 'text';
    const meta = m.metadata || {};

    // Image message
    if (msgType === 'image' && meta.url) {
      const imgUrl = String(meta.url);
      const imgName = meta.name ? String(meta.name) : 'Image';
      return (
        <div className="rounded-xl overflow-hidden max-w-[260px]">
          <div
            role="img"
            aria-label={imgName}
            className="w-full h-[200px] bg-cover bg-center cursor-pointer rounded-xl"
            style={{ backgroundImage: `url(${imgUrl})` }}
            onClick={() => window.open(imgUrl, '_blank')}
          />
          {meta.name ? (
            <p className={`text-[10px] mt-1 truncate ${isMe ? 'text-white/70' : 'text-[var(--muted-strong)]'}`}>
              {imgName}
            </p>
          ) : null}
        </div>
      );
    }

    // Document message
    if (msgType === 'document' && meta.url) {
      const docUrl = String(meta.url);
      const docName = meta.name ? String(meta.name) : 'Document';
      const size = meta.size ? `${(Number(meta.size) / 1024).toFixed(0)} KB` : '';
      return (
        <a
          href={docUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2.5 p-2 rounded-xl transition-all hover:opacity-80 ${isMe ? 'bg-white/15' : 'bg-[var(--surface)]'}`}
          style={{ minWidth: 180 }}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isMe ? 'bg-white/20' : 'bg-blue-500/15'}`}>
            <FileText size={16} className={isMe ? 'text-white' : 'text-blue-400'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${isMe ? 'text-white' : 'text-[var(--foreground)]'}`}>
              {docName}
            </p>
            {size && <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-[var(--muted-strong)]'}`}>{size}</p>}
          </div>
          <Download size={14} className={`shrink-0 ${isMe ? 'text-white/70' : 'text-[var(--muted-strong)]'}`} />
        </a>
      );
    }

    // Poll message
    if (msgType === 'poll' && meta.question) {
      const options = (meta.options as string[]) || [];
      const votes = pollVotes[m.id] || [];
      const totalVotes = votes.length;
      const myVote = votes.find(v => v.userId === user?.id);

      return (
        <div className="w-full max-w-[280px]">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 size={13} className={isMe ? 'text-white/80' : 'text-[var(--primary-light)]'} />
            <span className={`text-[11px] font-bold uppercase tracking-wide ${isMe ? 'text-white/70' : 'text-[var(--muted-strong)]'}`}>Poll</span>
          </div>
          <p className={`text-sm font-semibold mb-2.5 ${isMe ? 'text-white' : 'text-[var(--foreground)]'}`}>
            {String(meta.question)}
          </p>
          <div className="space-y-1.5">
            {options.map((opt, idx) => {
              const optVotes = votes.filter(v => v.optionIndex === idx).length;
              const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
              const isMyVote = myVote?.optionIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => handleVote(m.id, idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all relative overflow-hidden ${
                    isMyVote
                      ? 'ring-1'
                      : 'hover:opacity-90'
                  }`}
                  style={{
                    background: isMe ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                    color: isMe ? 'white' : 'var(--foreground)',
                    border: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
                    outline: isMyVote ? `2px solid ${circle.color}` : 'none',
                    outlineOffset: '-2px',
                  }}
                >
                  {/* Progress bar */}
                  {totalVotes > 0 && (
                    <div
                      className="absolute inset-0 rounded-xl transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: isMyVote ? `${circle.color}40` : `${circle.color}20`,
                      }}
                    />
                  )}
                  <div className="relative flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      {isMyVote && <span className="text-[10px]">✓</span>}
                      {opt}
                    </span>
                    {totalVotes > 0 && (
                      <span className={`text-[10px] ${isMe ? 'text-white/60' : 'text-[var(--muted-strong)]'}`}>{pct}%</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {totalVotes > 0 && (
            <p className={`text-[10px] mt-2 ${isMe ? 'text-white/50' : 'text-[var(--muted-strong)]'}`}>
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      );
    }

    // Default: text message
    return <>{m.text}</>;
  };

  return (
    <div className="flex flex-col h-[60dvh] rounded-2xl border border-[var(--glass-border)] overflow-hidden">
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative"
        style={getChatTheme(circle.name, circle.description, circle.color)}
      >
        {loading ? (
           <div className="flex-1 flex justify-center items-center">
             <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: circle.color, borderTopColor: 'transparent' }} />
           </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3 opacity-60"
              style={{ background: `${circle.color}15`, border: `1px solid ${circle.color}20` }}
            >
              {circle.emoji}
            </div>
            <p className="text-sm font-semibold text-[var(--foreground)] opacity-70">No messages yet</p>
            <p className="text-xs text-[var(--muted-strong)] mt-1">Be the first to say something in <span style={{ color: circle.color }}>{circle.name}</span>!</p>
          </div>
        ) : (
          <>
            {loadingMore && (
              <div className="flex justify-center my-2">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: circle.color, borderTopColor: 'transparent' }} />
              </div>
            )}
            {messages.map((m, i) => {
              const isMe = user?.id === m.senderId;
              const isConsecutive = i > 0 && messages[i-1].senderId === m.senderId;
              
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isConsecutive ? '-mt-2' : ''}`}>
                  {!isMe && !isConsecutive && (
                    <span className="text-[10px] text-[var(--muted-strong)] ml-2 mb-1">{m.senderName}</span>
                  )}
                  <div 
                    className={`px-3 py-2 rounded-2xl max-w-[85%] text-[13px] ${isMe ? 'text-white' : 'text-[var(--foreground)]'}`}
                    style={isMe 
                      ? { background: `linear-gradient(135deg, ${circle.color}, ${circle.color}dd)`, borderBottomRightRadius: '4px' } 
                      : { background: 'var(--background)', border: '1px solid var(--border)', borderBottomLeftRadius: '4px' }
                    }
                  >
                    {renderMessage(m, isMe)}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ── Upload indicator ── */}
      {uploading && (
        <div className="px-4 py-2 bg-[var(--surface)] border-t border-[var(--glass-border)] flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: circle.color, borderTopColor: 'transparent' }} />
          <span className="text-xs text-[var(--muted-strong)]">Uploading...</span>
        </div>
      )}

      {/* ── Poll creation form ── */}
      {showPollForm && (
        <div className="px-4 py-3 bg-[var(--surface)] border-t border-[var(--glass-border)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
              <BarChart3 size={13} style={{ color: circle.color }} /> Create Poll
            </span>
            <button onClick={() => { setShowPollForm(false); setShowAttach(false); }} className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <X size={14} />
            </button>
          </div>
          <input
            value={pollQuestion}
            onChange={e => setPollQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
            autoFocus
          />
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={e => {
                  const next = [...pollOptions];
                  next[i] = e.target.value;
                  setPollOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
              />
              {pollOptions.length > 2 && (
                <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-[var(--muted)] hover:text-red-400">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            {pollOptions.length < 6 && (
              <button
                onClick={() => setPollOptions([...pollOptions, ''])}
                className="text-[10px] font-semibold px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
                style={{ color: circle.color }}
              >
                + Add option
              </button>
            )}
            <button
              onClick={handleCreatePoll}
              disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40"
              style={{ background: circle.color }}
            >
              Create Poll
            </button>
          </div>
        </div>
      )}
      
      {/* ── Input bar ── */}
      <div className="p-3 bg-[var(--background)] border-t border-[var(--glass-border)]">
        {/* Attachment menu */}
        {showAttach && !showPollForm && (
          <div className="flex items-center gap-1 mb-2 p-1.5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-white/5 transition-colors text-[var(--foreground)]"
            >
              <ImageIcon size={14} className="text-emerald-400" /> Image
            </button>
            <button
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-white/5 transition-colors text-[var(--foreground)]"
            >
              <FileText size={14} className="text-blue-400" /> Document
            </button>
            <button
              onClick={() => setShowPollForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:bg-white/5 transition-colors text-[var(--foreground)]"
            >
              <BarChart3 size={14} className="text-amber-400" /> Poll
            </button>
          </div>
        )}

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'image'); e.target.value = ''; }} />
        <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.rar" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'document'); e.target.value = ''; }} />

        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setShowAttach(!showAttach); setShowPollForm(false); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${showAttach ? 'rotate-45' : ''}`}
            style={{ color: showAttach ? circle.color : 'var(--muted-strong)' }}
          >
            <Paperclip size={16} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Message ${circle.name}...`}
            className="flex-1 pl-3 pr-12 py-2.5 rounded-xl text-[13px] bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--primary)]/50 transition-colors"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim()}
            className="absolute right-1 w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
            style={{ background: `linear-gradient(135deg, ${circle.color}, ${circle.color}dd)` }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CirclesPage() {
  const { user } = useAuth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [listTab, setListTab] = useState<'joined' | 'discover'>('joined');
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [detailTab, setDetailTab] = useState<'rooms' | 'members' | 'messages'>('rooms');

  // Create room form
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('');
  const [creating, setCreating] = useState(false);

  // All members for the circle
  const [circleMembers, setCircleMembers] = useState<{userId: string; userName: string; department?: string}[]>([]);

  const roomPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCircles = useCallback(async () => {
    if (!user) return;
    try {
      const [circlesRes, roomsRes] = await Promise.all([
        fetch(`/api/circles?userId=${user.id}`),
        fetch('/api/rooms'),
      ]);
      const data = await circlesRes.json();
      const roomsData = await roomsRes.json();
      if (data.success) {
        setCircles(data.data.circles || []);
        setMemberships(data.data.memberships || []);
        setMemberCounts(data.data.memberCounts || {});
      }
      if (roomsData.success) setRooms(roomsData.data.rooms || []);
    } catch (err) {
      console.error('loadCircles:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCircles();
  }, [loadCircles]);

  // Poll rooms every 5s so live room status stays fresh
  useEffect(() => {
    const pollRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (data.success) setRooms(data.data.rooms || []);
      } catch { /* ignore */ }
    };
    roomPollRef.current = setInterval(pollRooms, 5000);
    return () => { if (roomPollRef.current) clearInterval(roomPollRef.current); };
  }, []);

  const loadMembers = useCallback(async (circleId: string) => {
    try {
      const res = await fetch('/api/circles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'members', circleId }),
      });
      const data = await res.json();
      if (data.success) setCircleMembers(data.data.members || []);
    } catch (err) {
      console.error('loadMembers:', err);
    }
  }, []);

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
      if (data.success) await loadCircles();
    } catch (err) {
      console.error('circle toggle:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateRoom = async () => {
    if (!user || !roomName.trim() || !selectedCircle) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          topic: roomTopic,
          description: '',
          creatorId: user.id,
          creatorName: user.name || user.email?.split('@')[0] || 'Student',
          maxMembers: 100,
          circleId: selectedCircle.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setRoomName('');
        setRoomTopic('');
        await loadCircles();
      }
    } catch (err) {
      console.error('createRoom:', err);
    } finally {
      setCreating(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getCircleStatus = (circle: Circle) => {
    const circleRooms = rooms.filter(r => r.circleId === circle.id && r.status === 'active');
    if (circleRooms.length > 0) return { status: 'live', detail: `${circleRooms[0].name} live` };
    return { status: 'quiet', detail: 'Quiet now' };
  };

  const selectCircle = (circle: Circle) => {
    setSelectedCircle(circle);
    setDetailTab('rooms');
    setShowCreate(false);
    setCircleMembers([]); // clear stale members from previous circle
    loadMembers(circle.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3.5rem)] flex">
          <div className="flex-1 flex items-center justify-center">
            <LoadingSkeleton type="cards" count={4} label="Loading circles..." />
          </div>
        </div>
      </div>
    );
  }

  const joined = circles.filter((c) => isJoined(c.id));
  const available = circles.filter((c) => !isJoined(c.id));
  const displayList = listTab === 'joined' ? joined : available;
  const filtered = search
    ? displayList.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : displayList;

  const activeCircle = selectedCircle || (joined.length > 0 ? joined[0] : circles[0]);
  const circleRooms = activeCircle ? rooms.filter(r => r.circleId === activeCircle.id) : [];
  const liveRooms = circleRooms.filter(r => r.status === 'active');




  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="h-[calc(100vh-4.5rem)] md:h-[calc(100vh-3.5rem)] flex">

        {/* ═══════ CIRCLE LIST (left panel) ═══════ */}
        <div className={`flex flex-col flex-1 md:flex-none md:w-72 lg:w-80 md:border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)] ${selectedCircle ? 'hidden md:flex' : 'flex'}`}>

          {/* Header */}
          <div className="flex items-center justify-between" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))', paddingBottom: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(168,85,247,0.15))', border: '1px solid rgba(124,58,237,0.3)' }}>🟣</div>
              <div>
                <h1 className="text-[17px] font-bold text-[var(--foreground)] leading-tight">Circles</h1>
                <p className="text-[11px] text-[var(--muted)]">{circles.length} communities</p>
              </div>
            </div>
            {memberships.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--primary-light)', border: '1px solid rgba(124,58,237,0.25)' }}>
                {memberships.length} joined
              </span>
            )}
          </div>

          {/* Search */}
          <div className="px-3 pb-2.5">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search circles..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl text-[13px] bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)]/50 transition-colors"
              />
            </div>
          </div>

          {/* Joined / Discover tabs — segmented control */}
          <div className="flex items-center gap-1 px-3 pb-3">
            <div className="flex flex-1 rounded-xl p-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {(['joined', 'discover'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setListTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all ${
                    listTab === tab
                      ? 'text-white shadow-sm'
                      : 'text-[var(--muted-strong)] hover:text-[var(--foreground)]'
                  }`}
                  style={listTab === tab ? { background: 'linear-gradient(135deg, var(--primary), var(--primary-light, #7c3aed))' } : {}}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Circle list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {search ? '🔍' : listTab === 'joined' ? '💜' : '✅'}
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)] mb-1">
                  {search ? 'No results' : listTab === 'joined' ? 'No circles yet' : 'All joined!'}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {search ? `No match for "${search}"` : listTab === 'joined' ? 'Go to Discover to join circles' : 'You joined every circle'}
                </p>
              </div>
            ) : (
              filtered.map((circle) => {
                const cs = getCircleStatus(circle);
                const isActive = activeCircle?.id === circle.id;
                const count = memberCounts[circle.id] || 0;
                return (
                  <button
                    key={circle.id}
                    onClick={() => selectCircle(circle)}
                    className="w-full text-left transition-all duration-200 rounded-2xl overflow-hidden active:scale-[0.98]"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${circle.color}18, ${circle.color}08)`
                        : 'var(--surface)',
                      border: isActive
                        ? `1px solid ${circle.color}40`
                        : '1px solid var(--border)',
                      boxShadow: isActive
                        ? `0 4px 20px ${circle.color}20, 0 0 0 1px ${circle.color}20`
                        : 'none',
                    }}
                  >
                    <div className="flex items-center gap-3 px-3.5 py-3.5">
                      {/* Left accent bar */}
                      <div
                        className="w-1 self-stretch rounded-full shrink-0"
                        style={{ background: isActive ? circle.color : 'transparent', minHeight: '36px' }}
                      />
                      {/* Emoji icon */}
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
                        style={{ backgroundColor: circle.color + '25', border: `1px solid ${circle.color}30` }}
                      >
                        {circle.emoji}
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h3 className={`text-[15px] truncate leading-tight ${isActive ? 'font-bold' : 'font-semibold'} text-[var(--foreground)]`}>
                            {circle.name}
                          </h3>
                          {cs.status === 'live' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 shrink-0 animate-pulse">
                              ● LIVE
                            </span>
                          )}
                        </div>
                        {/* Member pill */}
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: isActive ? `${circle.color}20` : 'rgba(255,255,255,0.06)',
                            color: isActive ? circle.color : 'var(--muted-strong)',
                            border: `1px solid ${isActive ? circle.color + '35' : 'transparent'}`,
                          }}
                        >
                          👥 {count} {count === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                      {/* Chevron on active */}
                      {isActive && (
                        <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: circle.color + '25' }}>
                          <span className="text-[10px]" style={{ color: circle.color }}>›</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════ CIRCLE DETAIL (right panel) ═══════ */}
        <div className={`${selectedCircle ? 'flex' : 'hidden md:flex'} flex-col flex-1 overflow-y-auto bg-[var(--background)]`}>
          {activeCircle ? (
            <div className="max-w-2xl" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: '1.5rem' }}>
              {/* Mobile back button */}
              <button
                onClick={() => setSelectedCircle(null)}
                className="md:hidden flex items-center gap-2 text-sm text-[var(--muted-strong)] hover:text-[var(--foreground)] mb-4 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Circles
              </button>
              {/* ─── Circle header ─── */}
              <div className="flex items-start gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: activeCircle.color + '20' }}
                >
                  {activeCircle.emoji}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[var(--foreground)]">{activeCircle.name}</h2>
                  <p className="text-xs text-[var(--muted-strong)] mt-1">{activeCircle.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {/* Member avatars */}
                    <div className="flex -space-x-2">
                      {circleMembers.slice(0, 4).map(m => (
                        <div key={m.userId} className={`w-6 h-6 rounded-full ${avatarColor(m.userName || 'U')} flex items-center justify-center text-white text-[8px] font-bold border-2 border-[var(--background)]`}>
                          {(m.userName || 'U').charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-[var(--muted-strong)]">{memberCounts[activeCircle.id] || 0} members</span>
                    {liveRooms.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                        ● {liveRooms.length} room{liveRooms.length > 1 ? 's' : ''} live
                      </span>
                    )}
                  </div>
                </div>
                {isJoined(activeCircle.id) ? (
                  <button
                    onClick={() => handleToggle(activeCircle.id)}
                    disabled={actionLoading === activeCircle.id}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--muted)] border border-[var(--border)] hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50"
                  >
                    {actionLoading === activeCircle.id ? 'Leaving...' : 'Leave'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggle(activeCircle.id)}
                    disabled={actionLoading === activeCircle.id}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
                    style={{ background: `linear-gradient(135deg, ${activeCircle.color}, ${activeCircle.color}dd)` }}
                  >
                    {actionLoading === activeCircle.id ? 'Joining...' : '+ Join'}
                  </button>
                )}
              </div>

              {/* ─── Detail tabs ─── */}
              <div className="flex items-center gap-4 mb-5 border-b border-[var(--border)] pb-2">
                {(['rooms', 'messages', 'members'] as const).map(t => {
                  const tabLabel = t === 'rooms' ? 'Live Room' : t;
                  return (
                  <button
                    key={t}
                    onClick={() => { setDetailTab(t); if (t === 'members') loadMembers(activeCircle.id); }}
                    className={`text-xs font-semibold pb-2 border-b-2 transition-all capitalize ${
                      detailTab === t
                        ? 'border-transparent' // Using inline style for dynamic active color
                        : 'border-transparent text-[var(--muted-strong)] hover:text-[var(--foreground)]'
                    }`}
                    style={detailTab === t ? { borderColor: activeCircle.color, color: activeCircle.color } : {}}
                  >
                    {tabLabel}
                  </button>
                  );
                })}
              </div>

              {/* ─── Rooms tab ─── */}
              {detailTab === 'rooms' && (
                <>
                  {/* LIVE NOW */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-green-500" />
                        LIVE NOW
                      </h3>
                      {isJoined(activeCircle.id) && (
                        <button
                          onClick={() => setShowCreate(true)}
                          className="text-[10px] font-semibold text-[var(--primary-light)] hover:underline"
                        >
                          + New room
                        </button>
                      )}
                    </div>

                    {liveRooms.length > 0 ? (
                      liveRooms.map(room => (
                        <Link
                          key={room.id}
                          href={`/rooms/${room.id}`}
                          className="block p-4 rounded-2xl mb-3 transition-all hover:border-green-500/30"
                          style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-lg">📚</div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-[var(--foreground)]">{room.name}{room.topic ? ` — ${room.topic}` : ''}</h4>
                              <p className="text-[11px] text-[var(--muted-strong)]">Started by {room.creatorName || 'someone'} · {timeAgo(room.createdAt)}</p>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">● Live</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {room.topic && <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/25 text-blue-300 font-semibold">{room.topic}</span>}
                            <span className="text-[10px] text-[var(--success)]">{timeAgo(room.createdAt)}</span>
                            <span className="ml-auto text-[10px] font-bold text-white px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500">Join</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                        <p className="text-xs text-[var(--muted-strong)]">No live rooms right now</p>
                      </div>
                    )}
                  </div>

                  {/* Create room form — only for members */}
                  {isJoined(activeCircle.id) && showCreate && (
                    <div className="p-4 rounded-2xl mb-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--foreground)]">📚 New Room in {activeCircle.name}</span>
                        <button onClick={() => setShowCreate(false)} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">✕</button>
                      </div>
                      <input
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        placeholder="Room name (e.g., Trees & Graphs DSA)"
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--primary)]/50"
                        autoFocus
                      />
                      <input
                        value={roomTopic}
                        onChange={e => setRoomTopic(e.target.value)}
                        placeholder="Topic (e.g., DSA, CP, Math)"
                        className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-[var(--glass-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--primary)]/50"
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleCreateRoom}
                          disabled={creating || !roomName.trim()}
                          className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40"
                        >
                          {creating ? 'Creating...' : 'Create Room'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* RECENT ACTIVITY */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2 mb-3">
                      <span className="w-1 h-4 rounded-full bg-violet-500" />
                      RECENT ACTIVITY
                    </h3>
                    {circleRooms.filter(r => r.status !== 'active').length > 0 ? (
                      <div className="space-y-2">
                        {circleRooms.filter(r => r.status !== 'active').slice(0, 5).map(room => (
                          <div key={room.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                            <div className={`w-8 h-8 rounded-full ${avatarColor(room.creatorName || 'U')} flex items-center justify-center text-white text-xs font-bold`}>
                              {(room.creatorName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-[var(--foreground)]">
                                <span className="font-bold">{room.creatorName || 'Someone'}</span> started a room — {room.name}
                              </p>
                            </div>
                            <span className="text-[11px] text-[var(--muted-strong)]">{timeAgo(room.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                        <p className="text-xs text-[var(--muted-strong)]">No recent activity yet. Start a room or invite friends!</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── Messages tab ─── */}
              {detailTab === 'messages' && (
                <CircleChat circle={activeCircle} />
              )}

              {/* ─── Members tab ─── */}
              {detailTab === 'members' && (
                <div>

                  {/* Member list */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2 mb-3">
                    <span className="w-1 h-4 rounded-full bg-amber-500" />
                    MEMBERS ({circleMembers.length})
                  </h3>
                  {circleMembers.length > 0 ? (
                    <div className="space-y-1">
                      {circleMembers.map(m => (
                        <div key={m.userId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--surface)] transition-all">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(m.userName || 'U')} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {(m.userName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--foreground)] font-medium truncate">{m.userName || 'Student'}</p>
                            {m.department && <p className="text-[10px] text-[var(--muted-strong)] truncate">{m.department}</p>}
                          </div>

                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                      <p className="text-xs text-[var(--muted-strong)]">No members to show</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl mb-4">⭕</div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Select a circle</p>
                <p className="text-xs text-[var(--muted-strong)] mt-1">Choose a circle from the list to see details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
