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
import { Search, Plus, ArrowLeft, Send, ChevronUp } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { getCircleMessages, sendCircleMessage, CircleMessage } from '@/lib/store/circles';

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

/* ─── Circle Chat Component ─── */
function CircleChat({ circle }: { circle: Circle }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const loadMessages = useCallback(async (isInitial = true) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const before = isInitial || messages.length === 0 ? undefined : messages[0].createdAt;
      const data = await getCircleMessages(circle.id, 50, before);
      if (data.length < 50) setHasMore(false);
      
      if (isInitial) {
        setMessages(data);
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      } else {
        const el = scrollRef.current;
        const oldHeight = el ? el.scrollHeight : 0;
        setMessages(prev => [...data, ...prev]);
        if (el) {
          setTimeout(() => {
            el.scrollTop = el.scrollHeight - oldHeight;
          }, 0);
        }
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
          const newMsg = {
            id: payload.new.id,
            circleId: payload.new.circle_id,
            senderId: payload.new.sender_id,
            senderName: payload.new.sender_name,
            text: payload.new.text,
            createdAt: payload.new.created_at,
          };
          setMessages(prev => [...prev, newMsg]);
          
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 100);
        }
      )
      .subscribe();
      
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [circle.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;
    const text = inputText.trim();
    setInputText('');
    await sendCircleMessage(circle.id, user.id, user.name || user.email?.split('@')[0] || 'Student', text);
  };
  
  const handleScroll = () => {
    if (!scrollRef.current) return;
    if (scrollRef.current.scrollTop === 0 && hasMore && !loadingMore && !loading) {
      loadMessages(false);
    }
  };

  return (
    <div className="flex flex-col h-[60dvh] rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] overflow-hidden">
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
      >
        {loading ? (
           <div className="flex-1 flex justify-center items-center">
             <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: circle.color, borderTopColor: 'transparent' }} />
           </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted-strong)] text-sm">
            <p>No messages yet.</p>
            <p className="text-xs">Start the conversation!</p>
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
                    {m.text}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
      
      <div className="p-3 bg-[var(--background)] border-t border-[var(--glass-border)]">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Message ${circle.name}...`}
            className="w-full pl-4 pr-12 py-2.5 rounded-xl text-[13px] bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--primary)]/50 transition-colors"
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
  const [roomMax, setRoomMax] = useState(5);
  const [creating, setCreating] = useState(false);

  // All members for the circle
  const [circleMembers, setCircleMembers] = useState<{userId: string; userName: string; department?: string}[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [allStudents, setAllStudents] = useState<{id: string; department: string}[]>([]);

  const roomPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCircles = useCallback(async () => {
    if (!user) return;
    try {
      const [circlesRes, roomsRes, studentsRes] = await Promise.all([
        fetch(`/api/circles?userId=${user.id}`),
        fetch('/api/rooms'),
        fetch('/api/students'),
      ]);
      const data = await circlesRes.json();
      const roomsData = await roomsRes.json();
      const studentsData = await studentsRes.json();
      if (data.success) {
        setCircles(data.data.circles || []);
        setMemberships(data.data.memberships || []);
        setMemberCounts(data.data.memberCounts || {});
      }
      if (roomsData.success) setRooms(roomsData.data.rooms || []);
      if (studentsData.success) setAllStudents(studentsData.data || []);
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
          maxMembers: roomMax,
          circleId: selectedCircle.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setRoomName('');
        setRoomTopic('');
        setRoomMax(5);
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

  // Dept stats — how many from your dept are in each circle
  const myDept = user?.department || '';


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
                {(['rooms', 'messages', 'members'] as const).map(t => (
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
                    {t}
                  </button>
                ))}
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
                            <span className="text-[11px] text-[var(--muted-strong)]">👥 {room.maxMembers} max</span>
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

                  {/* Start a new room — only for members */}
                  {isJoined(activeCircle.id) && (!showCreate ? (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface)] transition-all w-full text-left mb-5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
                        <Plus size={14} className="text-[var(--primary-light)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">Start a new room</p>
                        <p className="text-[11px] text-[var(--muted-strong)]">DSA · CP · Project · Discussion · Pomodoro</p>
                      </div>
                    </button>
                  ) : (
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
                        <select
                          value={roomMax}
                          onChange={e => setRoomMax(Number(e.target.value))}
                          className="px-3 py-2 rounded-xl text-xs border border-[var(--glass-border)] text-[var(--foreground)] outline-none"
                          style={{ backgroundColor: 'var(--surface)', colorScheme: 'dark' }}
                        >
                          {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n} style={{ backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>{n} people</option>)}
                        </select>
                        <button
                          onClick={handleCreateRoom}
                          disabled={creating || !roomName.trim()}
                          className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40"
                        >
                          {creating ? 'Creating...' : 'Create Room'}
                        </button>
                      </div>
                    </div>
                  ))}

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
                  {/* Dept breakdown for this circle */}
                  {myDept && circleMembers.length > 0 && (() => {
                    const deptCount = circleMembers.filter(m => m.department === myDept).length;
                    return deptCount > 0 ? (
                      <div className="rounded-2xl p-3 mb-4 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                        <span className="text-xl">🏛️</span>
                        <p className="text-xs text-[var(--foreground)]">
                          <span className="font-bold text-[var(--success)]">{deptCount}</span> member{deptCount !== 1 ? 's' : ''} from your department ({myDept}) are in this circle
                        </p>
                      </div>
                    ) : null;
                  })()}

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
                          {m.department === myDept && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 shrink-0">your dept</span>
                          )}
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
