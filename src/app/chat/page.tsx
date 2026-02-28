// ============================================
// MitrAI - WhatsApp-like Chat Page
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { DirectMessage, ChatThread, UserStatus } from '@/lib/types';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function ChatPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [pendingFriend, setPendingFriend] = useState<{ id: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const studentId = typeof window !== 'undefined'
    ? localStorage.getItem('mitrai_student_id') || user?.id
    : user?.id;

  // Load threads
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
    } catch { /* ignore */ }
    setLoading(false);
  }, [studentId]);

  // Load messages for selected chat
  const loadMessages = useCallback(async () => {
    if (!selectedChatId || !studentId) return;
    try {
      const res = await fetch(`/api/chat?chatId=${selectedChatId}&userId=${studentId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { /* ignore */ }
  }, [selectedChatId, studentId]);

  // Mark messages as read
  const markRead = useCallback(async () => {
    if (!selectedChatId || !studentId) return;
    try {
      await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChatId, userId: studentId }),
      });
    } catch { /* ignore */ }
  }, [selectedChatId, studentId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages();
      markRead();
    }
  }, [selectedChatId, loadMessages, markRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Supabase Realtime: subscribe to messages & threads instead of polling
  useEffect(() => {
    if (!studentId) return;

    // Subscribe to new/updated messages in any chat this user participates in
    const msgChannel = supabaseBrowser
      .channel('chat-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as Record<string, string> | undefined;
          if (!row) { loadThreads(); return; }
          // Only react to messages in chats involving this user
          if (row.sender_id === studentId || row.receiver_id === studentId) {
            loadThreads();
            if (selectedChatId && row.chat_id === selectedChatId) {
              loadMessages();
            }
          }
        }
      )
      .subscribe();

    // Subscribe to thread updates (unread counts, last message)
    const threadChannel = supabaseBrowser
      .channel('chat-threads')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_threads' },
        () => { loadThreads(); }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(msgChannel);
      supabaseBrowser.removeChannel(threadChannel);
    };
  }, [studentId, selectedChatId, loadThreads, loadMessages]);

  // Send message
  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedChatId || !studentId || sending) return;

    let receiverId: string;
    let receiverName: string;

    const selectedThread = threads.find(t => t.chatId === selectedChatId);
    if (selectedThread) {
      receiverId = selectedThread.user1Id === studentId
        ? selectedThread.user2Id
        : selectedThread.user1Id;
      receiverName = selectedThread.user1Id === studentId
        ? selectedThread.user2Name
        : selectedThread.user1Name;
    } else if (pendingFriend) {
      // No thread yet — use pending friend info from the friends page redirect
      receiverId = pendingFriend.id;
      receiverName = pendingFriend.name;
    } else {
      return;
    }

    setSending(true);
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: studentId,
          senderName: user?.name || 'Unknown',
          receiverId,
          receiverName,
          text: newMsg.trim(),
        }),
      });
      setNewMsg('');
      setPendingFriend(null);
      await loadMessages();
      await loadThreads();
      inputRef.current?.focus();
    } catch { /* ignore */ }
    setSending(false);
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!studentId || !confirm('Delete this message?')) return;
    try {
      const res = await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, userId: studentId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadMessages();
        await loadThreads();
      }
    } catch { /* ignore */ }
  };

  // Open a chat (from friends page redirect with query params) - NO auto-send
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const friendId = params.get('friendId');
    const friendName = params.get('friendName');
    if (friendId && studentId) {
      const chatId = [studentId, friendId].sort().join('__');
      setSelectedChatId(chatId);
      setShowSidebar(false);

      // Store pending friend info so the user can send the first message themselves
      if (friendName) {
        setPendingFriend({ id: friendId, name: friendName });
      }
      // Clean URL
      window.history.replaceState({}, '', '/chat');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const getOtherUserName = (thread: ChatThread) => {
    if (thread.user1Id === studentId) return thread.user2Name || 'Unknown';
    return thread.user1Name || 'Unknown';
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
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

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

  return (
    <div className="min-h-screen pt-14">
      <div className="h-[calc(100vh-56px)] flex">
        {/* ======= Sidebar / Thread List ======= */}
        <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-[var(--border)] bg-[var(--background)]`}>
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-[var(--foreground)]">💬 Chats</h1>
              <Link href="/friends" className="text-xs text-[var(--primary-light)] hover:underline">
                Friends
              </Link>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">Message your study buddies</p>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-3">🗨️</div>
                <p className="text-sm text-[var(--muted)]">No chats yet</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Add friends from the <Link href="/friends" className="text-[var(--primary-light)] hover:underline">Friends</Link> page to start chatting!
                </p>
              </div>
            ) : (
              threads.map(thread => {
                const otherName = getOtherUserName(thread);
                const otherId = thread.user1Id === studentId ? thread.user2Id : thread.user1Id;
                const otherStatus = statuses[otherId];
                const isOnline = otherStatus?.status === 'online' || otherStatus?.status === 'in-session';
                const unread = getUnreadCount(thread);
                const isActive = selectedChatId === thread.chatId;
                return (
                  <button
                    key={thread.chatId}
                    onClick={() => {
                      setSelectedChatId(thread.chatId);
                      setShowSidebar(false);
                      markRead();
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-[var(--border)]/50 ${
                      isActive
                        ? 'bg-[var(--surface-light)]'
                        : 'hover:bg-[var(--surface)]/50'
                    }`}
                  >
                    {/* Avatar with status dot */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-white font-semibold text-sm">
                        {otherName.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--background)] ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--foreground)] truncate">
                          {otherName}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] flex-shrink-0">
                          {thread.lastMessageAt ? formatTime(thread.lastMessageAt) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-[var(--muted)] truncate">
                          {thread.lastMessage || 'No messages yet'}
                        </span>
                        {unread > 0 && (
                          <span className="ml-2 bg-[var(--primary)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 min-w-[18px] text-center">
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

        {/* ======= Chat / Message Area ======= */}
        <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-[var(--surface)]/30`}>
          {selectedChatId ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center gap-3">
                {/* Back button (mobile) */}
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden text-[var(--muted)] hover:text-[var(--foreground)] p-1"
                >
                  ← 
                </button>
                {/* Avatar */}
                {(() => {
                  const thread = threads.find(t => t.chatId === selectedChatId);
                  const name = thread ? getOtherUserName(thread) : (pendingFriend?.name || '?');
                  const otherId = thread ? (thread.user1Id === studentId ? thread.user2Id : thread.user1Id) : (pendingFriend?.id || '');
                  const otherStatus = statuses[otherId];
                  const isOnline = otherStatus?.status === 'online' || otherStatus?.status === 'in-session';
                  return (
                    <>
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-white font-semibold text-xs">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--background)] ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--foreground)]">{name}</div>
                        <div className="text-[10px] text-[var(--muted)]">{isOnline ? '🟢 Online' : 'Offline'}</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-3xl mb-2">💬</div>
                      <p className="text-sm text-[var(--muted)]">No messages yet. Say hi!</p>
                    </div>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === studentId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
                      >
                        {isMine && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-1 text-red-400 hover:text-red-500 text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10"
                            title="Delete message"
                          >
                            🗑️
                          </button>
                        )}
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                            isMine
                              ? 'bg-[var(--primary)] text-white rounded-br-md'
                              : 'bg-[var(--surface-light)] text-[var(--foreground)] rounded-bl-md'
                          }`}
                        >
                          <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-[var(--muted)]'}`}>
                              {formatTime(msg.createdAt)}
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
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-[var(--border)] bg-[var(--background)]">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex items-center gap-2"
                >
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
                    className="btn-primary py-2.5 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      '➤'
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* No chat selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">💬</div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">MitrAI Chat</h2>
                <p className="text-sm text-[var(--muted)] mt-1">Select a conversation or start a new one</p>
                <Link href="/friends" className="btn-primary mt-4 inline-block text-sm py-2 px-4">
                  Find Friends
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
