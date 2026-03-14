// ============================================
// MitrAI - Chat Page (redesigned)
// Split view: sidebar with Arya AI + contacts | chat area
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { DirectMessage, ChatThread, UserStatus, StudentProfile, MatchResult } from '@/lib/types';
import { supabaseBrowser } from '@/lib/supabase-browser';
import SubTabBar from '@/components/SubTabBar';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import {
  Search,
  Paperclip,
  Smile,
  Send,
  MoreVertical,
  Phone,
} from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const { play: playSound } = useNotificationSound();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [pendingFriend, setPendingFriend] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'friends'>('all');
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [comingSoon, setComingSoon] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showComingSoon = () => {
    setComingSoon(true);
    setTimeout(() => setComingSoon(false), 2500);
  };

  const studentId = typeof window !== 'undefined'
    ? localStorage.getItem('mitrai_student_id') || user?.id
    : user?.id;

  const currentStudent = allStudents.find(s => s.id === studentId) || null;

  /* ─── helpers ─── */
  const avatarColors = ['bg-violet-600', 'bg-emerald-600', 'bg-blue-600', 'bg-pink-600', 'bg-amber-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-rose-600'];
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };
  const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';

  const getOtherUserName = (thread: ChatThread) => {
    if (thread.user1Id === studentId) return thread.user2Name || 'Unknown';
    return thread.user1Name || 'Unknown';
  };
  const getOtherUserId = (thread: ChatThread) => {
    return thread.user1Id === studentId ? thread.user2Id : thread.user1Id;
  };
  const getUnreadCount = (thread: ChatThread) => {
    if (thread.user1Id === studentId) return thread.unreadCount1;
    return thread.unreadCount2;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMessageTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  };

  const getDateLabel = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return `Today · ${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
    return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getStudentInfo = (userId: string) => {
    return allStudents.find(s => s.id === userId);
  };

  const getLastSeenText = (userId: string) => {
    const status = statuses[userId];
    if (!status) return '';
    if (status.status === 'online' || status.status === 'in-session') return 'Online';
    if (status.lastSeen) {
      const diff = Date.now() - new Date(status.lastSeen).getTime();
      if (diff < 3600000) return `last seen ${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `last seen ${Math.floor(diff / 3600000)}h ago`;
      return `last seen ${new Date(status.lastSeen).toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
    }
    return 'Offline';
  };

  /* ─── data loading ─── */
  const loadThreads = useCallback(async () => {
    if (!studentId) return;
    try {
      const [threadsRes, statusRes] = await Promise.all([
        fetch(`/api/chat?userId=${studentId}`),
        fetch('/api/status'),
      ]);
      const threadsData = await threadsRes.json();
      setThreads(threadsData.threads || []);

      const statusData = await statusRes.json();
      if (statusData.success) {
        const map: Record<string, UserStatus> = {};
        (statusData.data || []).forEach((s: UserStatus) => { map[s.userId] = s; });
        setStatuses(map);
      }
    } catch (err) { console.error('loadThreads:', err); }
    setLoading(false);
  }, [studentId]);

  const loadMessages = useCallback(async () => {
    if (!selectedChatId || !studentId) return;
    try {
      const res = await fetch(`/api/chat?chatId=${selectedChatId}&userId=${studentId}`);
      const data = await res.json();
      const serverMsgs: DirectMessage[] = data.messages || [];
      setMessages(prev => {
        const optimistic = prev.filter(m => m.id.startsWith('optimistic_') && !serverMsgs.some(s => s.text === m.text && s.senderId === m.senderId));
        return [...serverMsgs, ...optimistic];
      });
    } catch (err) { console.error('loadMessages:', err); }
  }, [selectedChatId, studentId]);

  const markRead = useCallback(async () => {
    if (!selectedChatId || !studentId) return;
    try {
      await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChatId, userId: studentId }),
      });
    } catch (err) { console.error('markRead:', err); }
  }, [selectedChatId, studentId]);

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) setAllStudents(data.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadFriends = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await fetch(`/api/friends?userId=${studentId}`);
      const data = await res.json();
      if (data.success) {
        const ids = new Set<string>(
          (data.data.friends || []).map((f: { user1Id: string; user2Id: string }) =>
            f.user1Id === studentId ? f.user2Id : f.user1Id
          )
        );
        setFriendIds(ids);
      }
    } catch { /* ignore */ }
  }, [studentId]);

  const loadMatchScores = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (data.success && data.data.matches) {
        const scores: Record<string, number> = {};
        data.data.matches.forEach((m: MatchResult) => {
          scores[m.student.id] = m.score.overall;
        });
        setMatchScores(scores);
      }
    } catch { /* ignore */ }
  }, [studentId]);

  useEffect(() => {
    loadThreads();
    loadStudents();
    loadFriends();
    loadMatchScores();
  }, [loadThreads, loadStudents, loadFriends, loadMatchScores]);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages();
      markRead();
    }
  }, [selectedChatId, loadMessages, markRead]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime
  useEffect(() => {
    if (!studentId) return;

    const msgChannel = supabaseBrowser
      .channel('chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as Record<string, string> | undefined;
          if (!row) return;
          if (row.sender_id !== studentId && row.receiver_id !== studentId) return;
          if (row.sender_id !== studentId) playSound('message');
          loadThreads();
          if (selectedChatId && row.chat_id === selectedChatId) {
            const newMessage: DirectMessage = {
              id: row.id,
              chatId: row.chat_id,
              senderId: row.sender_id,
              senderName: row.sender_name || '',
              receiverId: row.receiver_id || '',
              text: row.text,
              read: row.read === 'true',
              createdAt: row.created_at,
            };
            setMessages(prev => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              const optIdx = prev.findIndex(m => m.id.startsWith('optimistic_') && m.senderId === newMessage.senderId && m.text === newMessage.text);
              if (optIdx >= 0) { const updated = [...prev]; updated[optIdx] = newMessage; return updated; }
              return [...prev, newMessage];
            });
            if (row.sender_id !== studentId) markRead();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as Record<string, string> | undefined;
          if (!row) return;
          if (selectedChatId && row.chat_id === selectedChatId) {
            setMessages(prev => prev.map(m => m.id === row.id ? { ...m, read: row.read === 'true' || (row.read as unknown) === true } : m));
          }
        }
      )
      .subscribe();

    const threadChannel = supabaseBrowser
      .channel('chat-threads')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_threads' }, () => { loadThreads(); })
      .subscribe();

    const poll = setInterval(() => { if (selectedChatId) loadMessages(); }, 5000);

    return () => {
      supabaseBrowser.removeChannel(msgChannel);
      supabaseBrowser.removeChannel(threadChannel);
      clearInterval(poll);
    };
  }, [studentId, selectedChatId, loadThreads, loadMessages, markRead, playSound]);

  // Send message
  const sendMessage = async (text?: string) => {
    const msgText = (text || newMsg).trim();
    if (!msgText || !selectedChatId || !studentId || sending) return;

    let receiverId: string;
    let receiverName: string;
    const selectedThread = threads.find(t => t.chatId === selectedChatId);
    if (selectedThread) {
      receiverId = selectedThread.user1Id === studentId ? selectedThread.user2Id : selectedThread.user1Id;
      receiverName = selectedThread.user1Id === studentId ? selectedThread.user2Name : selectedThread.user1Name;
    } else if (pendingFriend) {
      receiverId = pendingFriend.id;
      receiverName = pendingFriend.name;
    } else return;

    setSending(true);
    setNewMsg('');
    inputRef.current?.focus();

    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticMsg: DirectMessage = {
      id: optimisticId, chatId: selectedChatId, senderId: studentId,
      senderName: user?.name || 'Unknown', receiverId, text: msgText,
      read: false, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setThreads(prev => prev.map(t => t.chatId === selectedChatId ? { ...t, lastMessage: msgText, lastMessageAt: new Date().toISOString() } : t));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: studentId, senderName: user?.name || 'Unknown', receiverId, receiverName, text: msgText }),
      });
      const data = await res.json();
      if (data.message) setMessages(prev => prev.map(m => m.id === optimisticId ? { ...data.message } : m));
      setPendingFriend(null);
      loadThreads();
    } catch (err) { console.error('sendMessage:', err); }
    setSending(false);
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!studentId || !confirm('Delete this message?')) return;
    setMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      const res = await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, userId: studentId }),
      });
      const data = await res.json();
      if (data.success) loadThreads();
      else loadMessages();
    } catch { loadMessages(); }
  };

  // URL params for deep linking
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const friendId = params.get('friendId');
    const friendName = params.get('friendName');
    if (friendId && studentId) {
      const chatId = [studentId, friendId].sort().join('__');
      setSelectedChatId(chatId);
      setShowSidebar(false);
      if (friendName) setPendingFriend({ id: friendId, name: friendName });
      window.history.replaceState({}, '', '/chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  /* ─── computed ─── */
  const totalUnread = threads.reduce((sum, t) => sum + getUnreadCount(t), 0);

  const filteredThreads = threads.filter(t => {
    const name = getOtherUserName(t);
    if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filter === 'unread' && getUnreadCount(t) === 0) return false;
    if (filter === 'friends' && !friendIds.has(getOtherUserId(t))) return false;
    return true;
  });

  // Quick replies
  const quickReplies = ['Study together?', 'Free tonight?', 'Need help?'];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center">
          <p className="text-[var(--muted)]">Please sign in to access chat</p>
          <Link href="/login" className="btn-primary mt-4 inline-block">Sign In</Link>
        </div>
      </div>
    );
  }

  /* ─── get selected chat info ─── */
  const selectedThread = threads.find(t => t.chatId === selectedChatId);
  const chatOtherName = selectedThread ? getOtherUserName(selectedThread) : (pendingFriend?.name || '?');
  const chatOtherId = selectedThread ? getOtherUserId(selectedThread) : (pendingFriend?.id || '');
  const chatOtherStudent = getStudentInfo(chatOtherId);
  const chatOtherStatus = statuses[chatOtherId];
  const chatIsOnline = chatOtherStatus?.status === 'online' || chatOtherStatus?.status === 'in-session';
  const chatMatchScore = matchScores[chatOtherId] || 0;

  // Build match context
  const getMatchContext = () => {
    if (!currentStudent || !chatOtherStudent) return null;
    const parts: string[] = [];
    if (currentStudent.department?.toLowerCase() === chatOtherStudent.department?.toLowerCase() && currentStudent.department) {
      parts.push(chatOtherStudent.department);
    }
    if (currentStudent.yearLevel?.toLowerCase() === chatOtherStudent.yearLevel?.toLowerCase() && currentStudent.yearLevel) {
      parts.push(chatOtherStudent.yearLevel);
    }
    if (parts.length === 0 && chatMatchScore === 0) return null;
    const context = parts.length > 0
      ? `You and ${chatOtherName.split(' ')[0]} are both in ${parts.join(' ')}`
      : `You and ${chatOtherName.split(' ')[0]} are matched`;
    return `${context}${chatMatchScore > 0 ? ` · ${chatMatchScore}% match` : ''}`;
  };

  // Group messages by date
  const messagesByDate: { date: string; msgs: DirectMessage[] }[] = [];
  messages.forEach(msg => {
    const dateKey = new Date(msg.createdAt).toDateString();
    const group = messagesByDate.find(g => g.date === dateKey);
    if (group) group.msgs.push(msg);
    else messagesByDate.push({ date: dateKey, msgs: [msg] });
  });

  return (
    <div className="min-h-screen chat-polish relative">
      <div className="chat-aura chat-aura-1" />
      <div className="chat-aura chat-aura-2" />
      <SubTabBar group="chat" />
      <div className="h-[calc(100vh-9rem)] flex">

        {/* ═══════ SIDEBAR ═══════ */}
        <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)]`}>

          {/* Search */}
          <div className="p-3 border-b border-[var(--border)]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-[var(--glass-border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
              />
            </div>
          </div>

          {/* Arya AI Banner */}
          <div className="mx-3 mt-3 p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold">A</div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Arya</p>
                  <p className="text-[10px] text-[var(--muted)]">The most realistic AI</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
              </span>
            </div>
            <div className="flex gap-2 mb-3">
              {[
                { icon: '💜', label: 'Feels your emotions' },
                { icon: '💬', label: 'Talks like a friend' },
                { icon: '✨', label: 'Personal growth' },
              ].map(f => (
                <div key={f.label} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl" style={{ background: 'var(--surface-light)' }}>
                  <span className="text-sm">{f.icon}</span>
                  <span className="text-[9px] text-[var(--muted)] text-center leading-tight">{f.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={showComingSoon} className="flex-1 py-2 rounded-xl text-xs font-semibold text-white text-center" style={{ background: 'linear-gradient(135deg, var(--primary), #6d28d9)' }}>
                Chat with Arya
              </button>
              <button onClick={showComingSoon} className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-500/25 transition-colors">
                <Phone size={16} />
              </button>
            </div>
          </div>

          {/* PEOPLE label + Filters */}
          <div className="px-3 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-2">People</p>
            <div className="flex gap-1.5">
              {(['all', 'unread', 'friends'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === f
                      ? 'bg-white text-[var(--background)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Friends'}
                </button>
              ))}
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] text-[var(--muted)]">Loading conversations...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-[var(--muted)]">
                  {searchQuery ? 'No matches found.' : filter === 'unread' ? 'No unread messages.' : 'No chats yet.'}
                </p>
                {!searchQuery && filter === 'all' && (
                  <Link href="/friends" className="text-xs text-[var(--primary-light)] hover:underline mt-2 inline-block">
                    Find friends to start chatting
                  </Link>
                )}
              </div>
            ) : (
              filteredThreads.map(thread => {
                const otherName = getOtherUserName(thread);
                const otherId = getOtherUserId(thread);
                const otherStudent = getStudentInfo(otherId);
                const otherStatus = statuses[otherId];
                const isOnline = otherStatus?.status === 'online' || otherStatus?.status === 'in-session';
                const unread = getUnreadCount(thread);
                const isActive = selectedChatId === thread.chatId;
                const score = matchScores[otherId] || 0;

                return (
                  <button
                    key={thread.chatId}
                    onClick={() => {
                      setSelectedChatId(thread.chatId);
                      setShowSidebar(false);
                      markRead();
                    }}
                    className={`w-full text-left mx-2 my-1 px-3 py-3 rounded-xl flex items-center gap-3 transition-colors border ${
                      isActive
                        ? 'bg-[var(--surface-light)] border-[var(--primary)]/35'
                        : 'bg-transparent border-transparent hover:bg-[var(--surface)] hover:border-[var(--border)]'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 rounded-xl ${getAvatarColor(otherName)} flex items-center justify-center text-white font-semibold text-sm`}>
                        {getInitial(otherName)}
                      </div>
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--background)]" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-semibold text-[var(--foreground)] truncate">{otherName}</span>
                        </div>
                        <span className="text-[10px] text-[var(--muted)] flex-shrink-0">
                          {thread.lastMessageAt ? formatTime(thread.lastMessageAt) : ''}
                        </span>
                      </div>
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mb-1">
                        {otherStudent?.department && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20 truncate max-w-[80px]">
                            {otherStudent.department.length > 8 ? otherStudent.department.slice(0, 8) : otherStudent.department} · {otherStudent.yearLevel || '?'}
                          </span>
                        )}
                        {score > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">
                            {score}%
                          </span>
                        )}
                      </div>
                      {/* Last message */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[var(--muted)] truncate">{thread.lastMessage || 'No messages yet'}</span>
                        {unread > 0 && (
                          <span className="ml-2 w-5 h-5 rounded-full bg-green-500 text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════ CHAT AREA ═══════ */}
        <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-[var(--surface)]/30`}>
          {selectedChatId ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_95%,transparent)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Back (mobile) */}
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="md:hidden text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
                  >
                    ←
                  </button>
                  {/* Avatar */}
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-xl ${getAvatarColor(chatOtherName)} flex items-center justify-center text-white font-semibold text-sm`}>
                      {getInitial(chatOtherName)}
                    </div>
                    {chatIsOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--background)]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--foreground)]">{chatOtherName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {chatOtherStudent?.department && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                          {chatOtherStudent.department.length > 8 ? chatOtherStudent.department.slice(0, 8) : chatOtherStudent.department} · {chatOtherStudent.yearLevel || '?'}
                        </span>
                      )}
                      {chatMatchScore > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">
                          {chatMatchScore}% match
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--muted)]">
                        · {getLastSeenText(chatOtherId)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 chat-message-pane">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[var(--muted)] mb-2">No messages yet</p>
                      <p className="text-xs text-[var(--muted)]">Say hi to {chatOtherName.split(' ')[0]}!</p>
                    </div>
                  </div>
                ) : (
                  messagesByDate.map(group => (
                    <div key={group.date}>
                      {/* Date separator */}
                      <div className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-medium text-[var(--muted)]" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                          {getDateLabel(group.msgs[0].createdAt)}
                        </span>
                      </div>

                      {/* Match context banner (only on first date group) */}
                      {group.date === messagesByDate[0]?.date && getMatchContext() && (
                        <div className="mx-auto max-w-md mb-4 px-4 py-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-violet-400 mb-1">Match Context</p>
                          <p className="text-xs text-[var(--foreground)]">{getMatchContext()}</p>
                        </div>
                      )}

                      {/* Messages */}
                      <div className="space-y-2">
                        {group.msgs.map(msg => {
                          const isMine = msg.senderId === studentId;
                          return (
                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
                              {isMine && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="opacity-40 md:opacity-0 md:group-hover:opacity-100 transition-opacity self-center mr-1 text-red-400 hover:text-red-500 text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10"
                                  title="Delete message"
                                >
                                  ✕
                                </button>
                              )}
                              <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                                isMine
                                  ? 'bg-[var(--primary)] text-white rounded-br-md'
                                  : 'bg-[var(--surface-light)] text-[var(--foreground)] rounded-bl-md border border-[var(--glass-border)]'
                              }`}>
                                <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                                <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                  <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-[var(--muted)]'}`}>
                                    {formatMessageTime(msg.createdAt)}
                                  </span>
                                  {isMine && (
                                    <span className="text-[10px] text-white/60">
                                      {msg.read ? '✓✓' : '✓'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies */}
              {messages.length <= 2 && (
                <div className="px-4 py-2 border-t border-[var(--border)] flex gap-2 overflow-x-auto no-scrollbar">
                  {quickReplies.map(reply => (
                    <button
                      key={reply}
                      onClick={() => sendMessage(reply)}
                      className="shrink-0 px-4 py-2 rounded-full text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-light)]"
                      style={{ border: '1px solid var(--glass-border)' }}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)]">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex items-center gap-2"
                >
                  <button type="button" onClick={showComingSoon} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1" title="Attach file">
                    <Paperclip size={18} />
                  </button>
                  <button type="button" onClick={showComingSoon} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1" title="Emoji">
                    <Smile size={18} />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 input-field text-sm py-2.5"
                    disabled={sending}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!newMsg.trim() || sending}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, var(--primary), #6d28d9)' }}
                  >
                    {sending ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* No chat selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">MitrAI Chat</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Select a conversation or start a new one</p>
                <Link href="/friends" className="btn-primary mt-4 inline-block text-sm py-2 px-4">
                  Find Friends
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coming Soon Toast */}
      {comingSoon && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-2xl" style={{ background: 'linear-gradient(135deg, var(--primary), #6d28d9)', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}>
            🚀 Coming Soon!
          </div>
        </div>
      )}

      <style jsx>{`
        .chat-polish { z-index: 1; }
        @keyframes bounce-in {
          0% { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
          50% { transform: translate(-50%, -5px) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-bounce-in { animation: bounce-in 0.35s ease-out; }
        .chat-aura {
          position: absolute; pointer-events: none; border-radius: 999px;
          filter: blur(52px); opacity: 0.12; z-index: 0;
        }
        .chat-aura-1 { width: 260px; height: 180px; top: 70px; left: -90px; background: rgba(99, 102, 241, 0.35); }
        .chat-aura-2 { width: 240px; height: 170px; top: 260px; right: -70px; background: rgba(236, 72, 153, 0.2); }
        .chat-message-pane { background-image: radial-gradient(circle at 20% 0%, rgba(124, 58, 237, 0.07), transparent 45%); }
        @media (max-width: 768px) { .chat-aura { opacity: 0.08; } }
        @media (prefers-reduced-motion: reduce) { .chat-aura { display: none; } }
      `}</style>
    </div>
  );
}
