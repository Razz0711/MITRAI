// ============================================
// MitrRAI - Arya Chat Page (Persistent)
// Messages stored in Supabase arya_messages
// Soft-delete via is_deleted_by_user flag
// ============================================
//
// is_deleted_by_user only affects UI rendering.
// Arya context loader always reads full message history
// regardless of this flag to maintain conversation continuity
// and learn user communication patterns.
//
// Messages are retained in DB to understand user tone,
// preferences, and communication style so Arya can
// personalize future responses. This data is never shown
// to other users and is only used internally for Arya's
// context window on next session load.

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreVertical, Trash2, X, Phone, PhoneOff, Mic } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useChatStability } from '@/hooks/useChatStability';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export default function AryaChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Voice call states
  const [inCall, setInCall] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'listening' | 'thinking' | 'speaking'>('connecting');
  const [callTimer, setCallTimer] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callActiveRef = useRef(false);
  useChatStability();

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Initialize conversation + load messages
  const initConversation = useCallback(async () => {
    if (!user) return;
    try {
      // Get or create conversation
      const convRes = await fetch('/api/arya/conversations');
      const convData = await convRes.json();
      if (!convData.success || !convData.data) {
        setLoading(false);
        return;
      }
      const convId = convData.data.id;
      setConversationId(convId);
      localStorage.setItem('arya_conversation_id', convId);

      // Fetch messages (filtered: is_deleted_by_user = false)
      const msgRes = await fetch(`/api/arya/messages?conversation_id=${convId}`);
      const msgData = await msgRes.json();
      if (msgData.success && msgData.data) {
        setMessages(msgData.data.map((m: Record<string, string>) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at,
        })));
      }
    } catch (err) {
      console.error('Init conversation error:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    initConversation();
  }, [initConversation]);

  // Persist message to DB
  const persistMessage = async (role: 'user' | 'assistant', content: string): Promise<Message | null> => {
    if (!conversationId) return null;
    try {
      const res = await fetch('/api/arya/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, role, content }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        return {
          id: data.data.id,
          role: data.data.role,
          content: data.data.content,
          created_at: data.data.created_at,
        };
      }
    } catch (err) {
      console.error('Persist message error:', err);
    }
    return null;
  };

  // Helper: call the Arya API with auto-retry
  const callAryaAPI = async (convId: string, text: string, retries = 1): Promise<{ success: boolean; response?: string }> => {
    try {
      const res = await fetch('/api/arya/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId, message: text }),
      });
      const data = await res.json();
      if (data.success && data.data?.response) {
        return { success: true, response: data.data.response };
      }
      // API returned error — retry if we have retries left
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1500));
        return callAryaAPI(convId, text, retries - 1);
      }
      return { success: false };
    } catch {
      // Network error — retry if we have retries left
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1500));
        return callAryaAPI(convId, text, retries - 1);
      }
      return { success: false };
    }
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || sending || !conversationId) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistic UI update for user message
    const optimisticUserId = `user-temp-${Date.now()}`;
    const optimisticUserMsg: Message = {
      id: optimisticUserId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, optimisticUserMsg]);

    // Persist user message in background (don't block UI)
    persistMessage('user', text).then(userMsg => {
      if (userMsg) {
        setMessages(prev => prev.map(m => m.id === optimisticUserId ? userMsg : m));
      }
    }).catch(() => { /* silent — optimistic msg stays */ });

    // Call API with 1 auto-retry on failure
    const result = await callAryaAPI(conversationId, text, 1);

    if (result.success && result.response) {
      // Show Arya's response IMMEDIATELY (optimistic)
      const optimisticAryaId = `arya-temp-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: optimisticAryaId,
        role: 'assistant' as const,
        content: result.response!,
        created_at: new Date().toISOString(),
      }]);

      // Persist to DB in background
      persistMessage('assistant', result.response).then(aryaMsg => {
        if (aryaMsg) {
          setMessages(prev => prev.map(m => m.id === optimisticAryaId ? aryaMsg : m));
        }
      }).catch(() => { /* silent */ });
    } else {
      // Both attempts failed — show friendly error
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'sorry yaar, there\'s a network issue on my side 🥺 try again in a sec!',
        created_at: new Date().toISOString(),
      }]);
    }

    setSending(false);
  };

  // ─── Voice Call Logic ───
  const startCall = () => {
    if (!conversationId) return;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert('Voice calling is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    setInCall(true);
    setCallTimer(0);
    setCallStatus('connecting');
    setLiveTranscript('');
    callActiveRef.current = true;

    // Start call timer
    callTimerRef.current = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);

    // Small delay then start listening
    setTimeout(() => {
      if (callActiveRef.current) startListening();
    }, 1000);
  };

  const endCall = () => {
    callActiveRef.current = false;
    setInCall(false);
    setCallStatus('connecting');
    setLiveTranscript('');
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    window.speechSynthesis?.cancel();
  };

  const startListening = () => {
    if (!callActiveRef.current) return;
    setCallStatus('listening');
    setLiveTranscript('');

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      setLiveTranscript(finalTranscript || interim);
    };

    recognition.onend = () => {
      if (!callActiveRef.current) return;
      if (finalTranscript.trim()) {
        handleVoiceResult(finalTranscript.trim());
      } else {
        // No speech detected — restart listening
        setTimeout(() => {
          if (callActiveRef.current) startListening();
        }, 300);
      }
    };

    recognition.onerror = () => {
      if (!callActiveRef.current) return;
      // Restart listening on error
      setTimeout(() => {
        if (callActiveRef.current) startListening();
      }, 500);
    };

    recognition.start();
  };

  const handleVoiceResult = async (text: string) => {
    if (!callActiveRef.current || !conversationId) return;
    setCallStatus('thinking');
    setLiveTranscript('');

    // Persist user voice message
    const userMsg: Message = {
      id: `voice-user-${Date.now()}`,
      role: 'user',
      content: `🎤 ${text}`,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    persistMessage('user', `🎤 ${text}`).catch(() => {});

    // Call Arya API
    const result = await callAryaAPI(conversationId, text, 1);

    if (!callActiveRef.current) return;

    const responseText = result.success && result.response
      ? result.response
      : 'sorry yaar, network issue on my side!';

    // Persist Arya's response
    const aryaMsg: Message = {
      id: `voice-arya-${Date.now()}`,
      role: 'assistant',
      content: responseText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, aryaMsg]);
    persistMessage('assistant', responseText).catch(() => {});

    // Speak the response
    setCallStatus('speaking');
    const utterance = new SpeechSynthesisUtterance(responseText);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    // Try to get a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v =>
      v.lang.includes('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha') || v.name.includes('Google UK English Female'))
    ) || voices.find(v => v.lang.includes('en-IN'))
      || voices.find(v => v.lang.includes('en'));
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.onend = () => {
      if (callActiveRef.current) {
        setTimeout(() => startListening(), 400);
      }
    };

    utterance.onerror = () => {
      if (callActiveRef.current) {
        setTimeout(() => startListening(), 400);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      callActiveRef.current = false;
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch { /* */ }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const formatCallTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Soft-delete single message (UI only — DB retains content)
  const handleDeleteMessage = async (msgId: string) => {
    setMenuMsgId(null);
    try {
      await fetch('/api/arya/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_message', message_id: msgId }),
      });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error('Delete message error:', err);
    }
  };

  // Clear entire chat (UI only — DB retains all content)
  const handleClearChat = async () => {
    setClearConfirm(false);
    setShowHeaderMenu(false);
    if (!conversationId) return;
    try {
      await fetch('/api/arya/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_chat', conversation_id: conversationId }),
      });
      setMessages([]);
    } catch (err) {
      console.error('Clear chat error:', err);
    }
  };

  // Long-press handler for messages
  const handleTouchStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => setMenuMsgId(msgId), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) return null;

  return (
    <div className="chat-container" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <button onClick={() => router.push('/arya')} className="p-1.5 rounded-lg hover:bg-[var(--surface-light)] text-[var(--muted)] transition-colors">
          <ArrowLeft size={18} />
        </button>
        <Image src="/arya-avatar.png" alt="Arya" width={36} height={36} className="w-9 h-9 rounded-full object-cover" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">Arya</p>
          <p className="text-[10px] text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
          </p>
        </div>
        {/* Call button */}
        <button
          onClick={startCall}
          className="p-2 rounded-xl hover:bg-green-500/15 text-green-400 transition-all active:scale-90"
          title="Call Arya"
        >
          <Phone size={18} />
        </button>
        {/* Header menu */}
        <div className="relative">
          <button 
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-light)] text-[var(--muted)] transition-colors"
          >
            <MoreVertical size={18} />
          </button>
          {showHeaderMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
              <div className="absolute right-0 top-10 z-50 w-44 rounded-xl py-1 shadow-xl" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => { setShowHeaderMenu(false); setClearConfirm(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} /> Clear chat
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages px-4 py-4 space-y-3">
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <p className="text-xs text-[var(--muted)] mt-3">Loading messages...</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <Image src="/arya-avatar.png" alt="Arya" width={56} height={56} className="w-14 h-14 rounded-full object-cover mx-auto" />
            <p className="text-sm font-semibold text-[var(--foreground)]">Start chatting with Arya</p>
            <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">Your campus bestie is always here — exams, stress, doubts, or just vibes 💜</p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative`}
            onTouchStart={() => handleTouchStart(msg.id)}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => { e.preventDefault(); setMenuMsgId(msg.id); }}
          >
            <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <Image src="/arya-avatar.png" alt="Arya" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0 mb-1" />
              )}
              <div className="relative">
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                <div className={`flex items-center gap-1.5 mt-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  <p className="text-[9px] text-[var(--muted)]">{formatTime(msg.created_at)}</p>
                  <button
                    onClick={() => setMenuMsgId(menuMsgId === msg.id ? null : msg.id)}
                    className="text-[var(--muted)] opacity-0 hover:opacity-100 transition-opacity p-0.5"
                  >
                    <MoreVertical size={10} />
                  </button>
                </div>

                {/* Per-message menu */}
                {menuMsgId === msg.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuMsgId(null)} />
                    <div
                      className={`absolute z-50 w-40 rounded-xl py-1 shadow-xl ${msg.role === 'user' ? 'right-0' : 'left-0'} bottom-full mb-1`}
                      style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}
                    >
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={13} /> Delete message
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <Image src="/arya-avatar.png" alt="Arya" width={28} height={28} className="w-7 h-7 rounded-full object-cover shrink-0 mb-1" />
              <div className="chat-bubble-ai">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-[var(--muted)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--glass-border)',
      }}>
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Message Arya..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] outline-none transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[#6d28d9] text-white flex items-center justify-center disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-purple-500/30 active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Clear Chat Confirmation */}
      {clearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setClearConfirm(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-72 rounded-2xl p-5 space-y-4 scale-in"
            style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-500/15 flex items-center justify-center mb-3">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Clear chat?</h3>
              <p className="text-xs text-[var(--muted)] mt-1">Messages will be cleared from your view. You can start fresh!</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setClearConfirm(false)} className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]">
                Cancel
              </button>
              <button onClick={handleClearChat} className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500 text-white">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Voice Call Overlay ─── */}
      {inCall && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, #1a0533 0%, #0a0a0a 100%)' }}>
          {/* Animated pulse rings */}
          <div className="relative mb-10">
            <div className="absolute inset-0 w-32 h-32 rounded-full border-2 border-purple-500/20" style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite', top: '-16px', left: '-16px', width: '160px', height: '160px' }} />
            <div className="absolute inset-0 w-32 h-32 rounded-full border border-purple-500/10" style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite 0.5s', top: '-32px', left: '-32px', width: '192px', height: '192px' }} />
            <Image
              src="/arya-avatar.png"
              alt="Arya"
              width={128}
              height={128}
              className="w-32 h-32 rounded-full object-cover ring-4 ring-purple-500/30 shadow-2xl shadow-purple-500/20"
            />
            {callStatus === 'listening' && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                <Mic size={14} className="text-white animate-pulse" />
              </div>
            )}
          </div>

          {/* Name & Status */}
          <h2 className="text-xl font-bold text-white mb-1">Arya</h2>
          <p className="text-sm text-purple-300/80 mb-2">
            {callStatus === 'connecting' && 'Connecting...'}
            {callStatus === 'listening' && '🎙️ Listening...'}
            {callStatus === 'thinking' && '💭 Thinking...'}
            {callStatus === 'speaking' && '🔊 Speaking...'}
          </p>

          {/* Live transcript */}
          {liveTranscript && (
            <div className="px-6 max-w-xs text-center">
              <p className="text-sm text-white/60 italic">"{liveTranscript}"</p>
            </div>
          )}

          {/* Timer */}
          <p className="text-2xl font-mono text-white/70 mt-6 tracking-widest">{formatCallTime(callTimer)}</p>

          {/* End Call */}
          <button
            onClick={endCall}
            className="mt-12 w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl shadow-red-500/30 active:scale-90 transition-transform"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
          <p className="text-[11px] text-white/40 mt-3">End Call</p>
        </div>
      )}
    </div>
  );
}
