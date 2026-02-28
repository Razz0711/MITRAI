// ============================================
// MitrAI - Single Room Page (chat + members)
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

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

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (isMember) {
      pollRef.current = setInterval(loadRoom, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isMember, loadRoom]);

  // Auto-scroll to bottom
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
        <p className="text-gray-400 text-lg">Room not found.</p>
        <Link href="/rooms" className="text-indigo-600 hover:underline">← Back to Rooms</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_250px] gap-6 h-[calc(100vh-120px)]">
      {/* Main Chat Area */}
      <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
        {/* Room Header */}
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/rooms" className="text-gray-400 hover:text-gray-600">←</Link>
              <h1 className="text-lg font-bold dark:text-white">{room.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                room.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500'
              }`}>{room.status}</span>
            </div>
            {room.topic && (
              <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">{room.topic}</p>
            )}
          </div>
          {isMember && (
            <button
              onClick={handleLeave}
              className="text-xs text-red-500 hover:underline"
            >
              Leave
            </button>
          )}
        </div>

        {/* Messages */}
        {isMember ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  No messages yet. Start the conversation! 💬
                </p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded-bl-md'
                        }`}
                      >
                        {!isMe && (
                          <p className="text-xs font-semibold text-indigo-400 mb-0.5">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm">{msg.text}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t dark:border-gray-700 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <p className="text-4xl mb-4">🔒</p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Join this room to chat with other students
            </p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {joining ? 'Joining...' : `Join Room (${members.length}/${room.maxMembers})`}
            </button>
          </div>
        )}
      </div>

      {/* Members Sidebar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 space-y-4 hidden md:block">
        <h2 className="font-bold dark:text-white">
          Members ({members.length}/{room.maxMembers})
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center gap-2 text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                {m.userName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="dark:text-white">
                  {m.userName}
                  {m.userId === user?.id && (
                    <span className="text-xs text-gray-400 ml-1">(you)</span>
                  )}
                </p>
                {m.role === 'creator' && (
                  <span className="text-[10px] text-amber-500">Creator</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {room.description && (
          <>
            <hr className="dark:border-gray-700" />
            <div>
              <h3 className="text-xs uppercase text-gray-400 mb-1">About</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{room.description}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
