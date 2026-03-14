// ============================================
// MitrAI - Home Page (redesigned)
// Two-tab layout: Home page | DM page
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { BirthdayInfo, ChatThread, StudentProfile, MatchResult, UserStatus } from '@/lib/types';
import BirthdayBanner from '@/components/BirthdayBanner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  Bell,
  Home as HomeIcon,
  MessageSquare,
  Search,
  Plus,
  ArrowLeft,
  ArrowRight,
  Users,
  Grid3X3,
  Star,
  Repeat2,
} from 'lucide-react';

/* ─── types ─── */
interface RadarPing {
  id: string;
  userId: string;
  userName: string;
  activityId: string;
  zone: string;
  note: string;
  isAnonymous: boolean;
  createdAt: string;
  expiresAt: string;
}
interface AnonStats {
  queueCount: number;
  activeRooms: number;
  queueByType: Record<string, number>;
}

/* ─── main component ─── */
export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<'home' | 'dm'>('home');

  // Data state
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState<RadarPing[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [anonStats, setAnonStats] = useState<AnonStats | null>(null);
  const [birthdays, setBirthdays] = useState<BirthdayInfo[]>([]);
  const [wishedMap, setWishedMap] = useState<Record<string, boolean>>({});
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [topMatch, setTopMatch] = useState<MatchResult | null>(null);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, UserStatus>>({});
  const [roomCount, setRoomCount] = useState(0);

  // DM tab state
  const [dmSearch, setDmSearch] = useState('');
  const [dmFilter, setDmFilter] = useState<'all' | 'unread' | 'friends'>('all');
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());

  /* ─── helpers ─── */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatThreadTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || 'S';

  const getOtherUser = useCallback((thread: ChatThread) => {
    if (thread.user1Id === user?.id) {
      return { id: thread.user2Id, name: thread.user2Name, unread: thread.unreadCount1 };
    }
    return { id: thread.user1Id, name: thread.user1Name, unread: thread.unreadCount2 };
  }, [user?.id]);

  const avatarColors = ['bg-violet-600', 'bg-emerald-600', 'bg-blue-600', 'bg-pink-600', 'bg-amber-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-rose-600'];
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  /* ─── data loading ─── */
  useEffect(() => {
    if (!user) return;
    loadData();
    loadBirthdays();
    loadSnapshot();
    loadMatches();
    loadFriends();
    loadStatuses();

    const interval = setInterval(() => { loadSnapshot(); }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [studentRes, studentsRes] = await Promise.all([
        fetch(`/api/students?id=${encodeURIComponent(user.id)}`),
        fetch('/api/students'),
      ]);
      const [studentData, studentsData] = await Promise.all([studentRes.json(), studentsRes.json()]);
      if (studentData.success) setStudent(studentData.data as StudentProfile);
      if (studentsData.success) setAllStudents(studentsData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBirthdays = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/birthday?days=7&userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setBirthdays(data.data.birthdays || []);
        setWishedMap(data.data.wishedMap || {});
      }
    } catch { /* ignore */ }
  }, [user]);

  const loadSnapshot = async () => {
    if (!user) return;
    try {
      const [radarRes, chatRes, anonRes, roomsRes] = await Promise.all([
        fetch(`/api/radar?userId=${user.id}`),
        fetch(`/api/chat?userId=${user.id}`),
        fetch('/api/anon?check=stats'),
        fetch('/api/rooms'),
      ]);
      const [radarData, chatData, anonData, roomsData] = await Promise.all([
        radarRes.json(), chatRes.json(), anonRes.json(), roomsRes.json(),
      ]);
      if (radarData?.success) setPings(radarData.data?.pings || []);
      if (Array.isArray(chatData?.threads)) setThreads(chatData.threads as ChatThread[]);
      if (anonData?.success) setAnonStats(anonData.data as AnonStats);
      if (roomsData?.success) setRoomCount((roomsData.data?.rooms || []).filter((r: { isActive: boolean }) => r.isActive).length);
    } catch { /* ignore */ }
  };

  const loadMatches = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: user.id }),
      });
      const data = await res.json();
      if (data.success && data.data.matches) {
        setTopMatch(data.data.matches[0] || null);
        // Count exact matches (branch + year)
        const allCandidates = allStudents.filter(
          s => s.id !== user.id &&
          s.department === (data.data.student?.department || '') &&
          s.yearLevel === (data.data.student?.yearLevel || '')
        );
        setMatchCount(allCandidates.length || data.data.matches.length);
      }
    } catch { /* ignore */ }
  };

  const loadStatuses = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const map: Record<string, UserStatus> = {};
        data.data.forEach((s: UserStatus) => { map[s.userId] = s; });
        setOnlineStatuses(map);
      }
    } catch { /* ignore */ }
  };

  const loadFriends = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        const ids = new Set<string>(
          (data.data.friends || []).map((f: { user1Id: string; user2Id: string }) =>
            f.user1Id === user.id ? f.user2Id : f.user1Id
          )
        );
        setFriendIds(ids);
      }
    } catch { /* ignore */ }
  }, [user]);

  // recalculate match count when allStudents load
  useEffect(() => {
    if (!user || !student || allStudents.length === 0) return;
    const exact = allStudents.filter(
      s => s.id !== user.id &&
      s.department?.toLowerCase() === student.department?.toLowerCase() &&
      s.yearLevel?.toLowerCase() === student.yearLevel?.toLowerCase()
    );
    if (exact.length > 0) setMatchCount(exact.length);
  }, [allStudents, student, user]);

  const handleWish = async (toUserId: string, toUserName: string) => {
    if (!user) return;
    try {
      await fetch('/api/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, fromUserName: user.name, toUserId, toUserName }),
      });
    } catch { /* ignore */ }
  };

  /* ─── loading state ─── */
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="stats" count={3} label="Loading home..." />
      </div>
    );
  }

  /* ─── computed values ─── */
  const firstName = (student?.name || user?.name || 'Student').split(' ')[0];
  const branch = student?.department || user?.department || 'Not set';
  const year = student?.yearLevel || user?.yearLevel || 'Not set';
  const liveOthers = pings.filter(p => p.userId !== user?.id);
  const anonLiveTotal = (anonStats?.queueCount || 0) + (anonStats?.activeRooms || 0) * 2;
  const isCampusQuiet = liveOthers.length === 0;
  const unreadTotal = threads.reduce((sum, t) => {
    if (t.user1Id === user?.id) return sum + t.unreadCount1;
    return sum + t.unreadCount2;
  }, 0);
  const recentThreads = threads.slice(0, 3);

  // DM tab computed
  const filteredThreads = threads.filter(t => {
    const other = getOtherUser(t);
    if (dmSearch && !other.name.toLowerCase().includes(dmSearch.toLowerCase())) return false;
    if (dmFilter === 'unread' && other.unread === 0) return false;
    if (dmFilter === 'friends' && !friendIds.has(other.id)) return false;
    return true;
  });

  const onlineUsers = allStudents.filter(s =>
    s.id !== user?.id &&
    onlineStatuses[s.id] &&
    (onlineStatuses[s.id].status === 'online' || onlineStatuses[s.id].status === 'in-session')
  ).slice(0, 8);

  // Relationship badge helper
  const getRelBadge = (otherId: string, otherName: string) => {
    const otherStudent = allStudents.find(s => s.id === otherId);
    if (friendIds.has(otherId)) return { label: 'Friend', color: 'bg-green-500/15 text-green-400 border-green-500/20' };
    if (otherStudent?.department?.toLowerCase() === student?.department?.toLowerCase() && otherStudent?.yearLevel?.toLowerCase() === student?.yearLevel?.toLowerCase()) {
      return { label: 'Same batch', color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' };
    }
    if (otherStudent?.department?.toLowerCase() === student?.department?.toLowerCase()) {
      return { label: 'Same branch', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' };
    }
    if (otherStudent?.yearLevel?.toLowerCase() === student?.yearLevel?.toLowerCase()) {
      return { label: 'Same year', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
    }
    return null;
  };

  /* ─── render ─── */
  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-5 relative min-h-screen">
      {/* Ambient effects */}
      <div className="home-aura home-aura-1" />
      <div className="home-aura home-aura-2" />

      {/* ─── TAB SWITCHER ─── */}
      <div className="flex items-center rounded-2xl p-1" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
            activeTab === 'home'
              ? 'text-white shadow-lg'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
          style={activeTab === 'home' ? {
            background: 'linear-gradient(135deg, var(--primary), #6d28d9)',
            boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
          } : {}}
        >
          <HomeIcon size={14} /> Home page
        </button>
        <button
          onClick={() => setActiveTab('dm')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
            activeTab === 'dm'
              ? 'text-white shadow-lg'
              : 'text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
          style={activeTab === 'dm' ? {
            background: 'linear-gradient(135deg, var(--primary), #6d28d9)',
            boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
          } : {}}
        >
          <MessageSquare size={14} /> DM page
        </button>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* ─── HOME TAB ─── */}
      {/* ══════════════════════════════════════ */}
      {activeTab === 'home' && (
        <div className="space-y-5 slide-up">

          {/* ── Header: Logo + Bell + Avatar ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white text-sm font-extrabold shadow-lg">
                M
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)] leading-tight">MitrAI</p>
                <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">SVNIT</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors relative">
                <Bell size={16} />
                {unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center">{unreadTotal > 9 ? '9+' : unreadTotal}</span>
                )}
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {getInitial(firstName)}
              </div>
            </div>
          </div>

          {/* ── Greeting ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              {getGreeting()}
            </p>
            <h1 className="text-2xl font-extrabold text-[var(--foreground)] mt-0.5">
              Hey, <span className="gradient-text">{firstName}</span> 👋
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="profile-chip">🎓 {branch}</span>
              <span className="profile-chip">📅 {year}</span>
            </div>
          </div>

          {/* ── Status pills ── */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCampusQuiet ? 'bg-gray-400' : 'bg-green-500'}`} />
              {isCampusQuiet ? 'Campus quiet now' : `${liveOthers.length} live on campus`}
            </span>
            {anonLiveTotal > 0 && (
              <Link href="/anon" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-pink-500/12 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                {anonLiveTotal} in Anon Chat →
              </Link>
            )}
            {roomCount > 0 && (
              <Link href="/rooms" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-green-500/12 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {roomCount} room{roomCount !== 1 ? 's' : ''} live
              </Link>
            )}
          </div>

          {/* ── Birthday banner ── */}
          {birthdays.length > 0 && (
            <BirthdayBanner
              birthdays={birthdays}
              wishedMap={wishedMap}
              onWish={handleWish}
              currentUserId={user?.id || ''}
            />
          )}

          {/* ── YOUR MATCHES ── */}
          <div>
            <SectionLabel>Your matches</SectionLabel>
            <div className="mt-2 card p-5 relative overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
              {/* Match count circle */}
              <div className="absolute top-4 right-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 border border-violet-500/20 flex flex-col items-center justify-center">
                <span className="text-lg font-extrabold text-[var(--foreground)]">{matchCount}</span>
                <span className="text-[8px] text-[var(--muted)] leading-tight">exact matches</span>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-500/12 text-violet-400 border border-violet-500/20">
                ✦ BRANCH + YEAR MATCHING
              </span>
              <h2 className="text-base font-bold text-[var(--foreground)] mt-3">Find your study match</h2>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-[70%] leading-relaxed">
                Ranked students from your exact branch and year — no setup needed.
              </p>

              {/* Info row */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl p-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">Branch</p>
                  <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5 truncate">{branch}</p>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">Year</p>
                  <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5">{year}</p>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">Top Match</p>
                  <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5 truncate">
                    {topMatch ? `${topMatch.student.name.split(' ')[0]} · ${topMatch.score.overall}%` : '—'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href="/matches"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}
                >
                  See my matches <ArrowRight size={14} />
                </Link>
                <Link href="/chat" className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                  Open chats
                </Link>
              </div>
            </div>
          </div>

          {/* ── LIVE ON CAMPUS ── */}
          <div>
            <SectionLabel>Live on campus</SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {/* Radar card */}
              <div className="card p-4 flex flex-col justify-between" style={{ border: '1px solid var(--glass-border)' }}>
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> RADAR
                  </span>
                  <h3 className="text-sm font-bold text-[var(--foreground)] mt-2">Broadcast intent</h3>
                  <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
                    Tell campus what you need — study session, chai, quick help.
                  </p>
                </div>
                <Link
                  href="/radar"
                  className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold text-white text-center transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}
                >
                  Go live →
                </Link>
              </div>
              {/* Anonymous card */}
              <div className="card p-4 flex flex-col justify-between" style={{ border: '1px solid var(--glass-border)' }}>
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-400">
                    🔒 ANONYMOUS
                  </span>
                  <h3 className="text-sm font-bold text-[var(--foreground)] mt-2">Talk freely</h3>
                  <p className="text-[11px] text-[var(--muted)] mt-1 leading-relaxed">
                    Vent, confess, career anxiety — {anonLiveTotal > 0 ? `${anonLiveTotal} chatting right now` : 'start a chat'}, no names.
                  </p>
                </div>
                <Link
                  href="/anon"
                  className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold text-white text-center transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)', boxShadow: '0 2px 12px rgba(236,72,153,0.3)' }}
                >
                  Join now →
                </Link>
              </div>
            </div>
          </div>

          {/* ── DIRECT MESSAGES ── */}
          <div>
            <SectionLabel>Direct messages</SectionLabel>
            <div className="mt-2 card p-4" style={{ border: '1px solid var(--glass-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Your conversations</h3>
                  <p className="text-[11px] text-[var(--muted)]">
                    {threads.length} chat{threads.length !== 1 ? 's' : ''} · {unreadTotal} unread
                  </p>
                </div>
                {unreadTotal > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-green-500/15 text-[10px] font-bold text-green-400 border border-green-500/20">
                    {unreadTotal} unread
                  </span>
                )}
              </div>

              {recentThreads.length === 0 ? (
                <p className="text-xs text-[var(--muted)] py-4 text-center">No conversations yet. Start chatting with your matches!</p>
              ) : (
                <div className="space-y-1">
                  {recentThreads.map(thread => {
                    const other = getOtherUser(thread);
                    return (
                      <Link
                        key={thread.chatId}
                        href={`/chat?friendId=${encodeURIComponent(other.id)}&friendName=${encodeURIComponent(other.name)}`}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-light)] transition-colors"
                      >
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-xl ${getAvatarColor(other.name)} flex items-center justify-center text-white text-sm font-bold`}>
                            {getInitial(other.name)}
                          </div>
                          {onlineStatuses[other.id] && (onlineStatuses[other.id].status === 'online' || onlineStatuses[other.id].status === 'in-session') && (
                            <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--background)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{other.name}</p>
                          <p className="text-[11px] text-[var(--muted)] truncate">{thread.lastMessage || 'No messages yet'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] text-[var(--muted)]">{thread.lastMessageAt ? formatThreadTime(thread.lastMessageAt) : ''}</span>
                          {other.unread > 0 && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center">
                              {other.unread}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                <span className="text-[10px] text-[var(--muted)]">Tap any chat to open</span>
                <button onClick={() => setActiveTab('dm')} className="text-xs font-semibold text-[var(--primary-light)] hover:underline flex items-center gap-1">
                  See all <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* ── EXPLORE ── */}
          <div>
            <SectionLabel>Explore</SectionLabel>
            <div className="mt-2 grid grid-cols-4 gap-2.5">
              <ExploreTile href="/circles" icon="⬤" title="Circles" subtitle="Communities" tag="7 joined" tagColor="green" />
              <ExploreTile href="/rooms" icon="🚪" title="Rooms" subtitle="Study groups" tag={roomCount > 0 ? `${roomCount} active` : 'Join'} tagColor="amber" />
              <ExploreTile href="/skills" icon={<Repeat2 size={18} className="text-blue-400" />} title="Skill Swap" subtitle="Teach & learn" tag="Soon" tagColor="amber" />
              <ExploreTile href="/subscription" icon={<Star size={18} className="text-amber-400" />} title="Pro" subtitle="More features" tag="Upgrade" tagColor="amber" />
            </div>
          </div>

          {/* ── GROW YOUR CAMPUS ── */}
          <div className="card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{
            background: 'linear-gradient(135deg, rgba(234,179,8,0.06), rgba(249,115,22,0.06))',
            border: '1px solid rgba(234,179,8,0.15)',
          }}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">🌱 Grow your campus</span>
              <h3 className="text-sm font-bold text-[var(--foreground)] mt-1">Invite your batchmates</h3>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">More students = better matches for you</p>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Hey! Join MitrAI — the study buddy matching platform for SVNIT students 🎓\n\nFind your perfect study partner, join circles, anonymous chat & more.\n\nhttps://mitrai.vercel.app')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}
            >
              Share on WhatsApp
            </a>
          </div>

          {/* bottom spacer for tab bar */}
          <div className="h-4" />
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ─── DM TAB ─── */}
      {/* ══════════════════════════════════════ */}
      {activeTab === 'dm' && (
        <div className="space-y-5 slide-up">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveTab('home')} className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-[var(--foreground)]">Messages</h1>
                <p className="text-[11px] text-[var(--muted)]">Your study buddy conversations</p>
              </div>
            </div>
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--primary), #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.35)' }}
            >
              <Plus size={14} /> New chat
            </Link>
          </div>

          {/* ── Search ── */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={dmSearch}
              onChange={e => setDmSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border border-[var(--glass-border)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
            />
          </div>

          {/* ── Filters ── */}
          <div className="flex gap-2">
            {(['all', 'unread', 'friends'] as const).map(f => (
              <button
                key={f}
                onClick={() => setDmFilter(f)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  dmFilter === f
                    ? 'text-white shadow-md'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
                style={dmFilter === f
                  ? { background: 'linear-gradient(135deg, var(--primary), #6d28d9)', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }
                  : { background: 'var(--surface)', border: '1px solid var(--glass-border)' }
                }
              >
                {f === 'all' ? 'All' : f === 'unread' ? `Unread (${unreadTotal})` : 'Friends'}
              </button>
            ))}
          </div>

          {/* ── Online now ── */}
          {onlineUsers.length > 0 && (
            <div>
              <SectionLabel>Online now</SectionLabel>
              <div className="mt-2 flex gap-4 overflow-x-auto no-scrollbar pb-1">
                {onlineUsers.map(s => (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/chat?friendId=${encodeURIComponent(s.id)}&friendName=${encodeURIComponent(s.name)}`)}
                    className="flex flex-col items-center gap-1 shrink-0"
                  >
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-xl ${getAvatarColor(s.name)} flex items-center justify-center text-white text-sm font-bold`}>
                        {getInitial(s.name)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--background)]" />
                    </div>
                    <span className="text-[10px] text-[var(--muted)] truncate max-w-[50px]">{s.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent ── */}
          <div>
            <SectionLabel>Recent</SectionLabel>
            <div className="mt-2 card" style={{ border: '1px solid var(--glass-border)' }}>
              {filteredThreads.length === 0 ? (
                <p className="text-xs text-[var(--muted)] p-6 text-center">
                  {dmSearch ? 'No conversations match your search.' : dmFilter === 'unread' ? 'No unread messages.' : 'No conversations yet.'}
                </p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {filteredThreads.map(thread => {
                    const other = getOtherUser(thread);
                    const relBadge = getRelBadge(other.id, other.name);
                    return (
                      <Link
                        key={thread.chatId}
                        href={`/chat?friendId=${encodeURIComponent(other.id)}&friendName=${encodeURIComponent(other.name)}`}
                        className="flex items-center gap-3 p-4 hover:bg-[var(--surface-light)] transition-colors"
                      >
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-xl ${getAvatarColor(other.name)} flex items-center justify-center text-white text-sm font-bold`}>
                            {getInitial(other.name)}
                          </div>
                          {onlineStatuses[other.id] && (onlineStatuses[other.id].status === 'online' || onlineStatuses[other.id].status === 'in-session') && (
                            <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[var(--background)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{other.name}</p>
                          <p className="text-[11px] text-[var(--muted)] truncate">{thread.lastMessage || 'No messages yet'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[10px] text-[var(--muted)]">{thread.lastMessageAt ? formatThreadTime(thread.lastMessageAt) : ''}</span>
                          <div className="flex items-center gap-1.5">
                            {relBadge && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${relBadge.color}`}>
                                {relBadge.label}
                              </span>
                            )}
                            {other.unread > 0 && (
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center">
                                {other.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Start a new conversation ── */}
          <div>
            <SectionLabel>Start a new conversation</SectionLabel>
            <div className="mt-2 space-y-2">
              <Link href="/matches" className="card p-4 flex items-center gap-3 hover:bg-[var(--surface-light)] transition-colors" style={{ border: '1px solid var(--glass-border)' }}>
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                  <Plus size={16} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-400">Message a match</p>
                  <p className="text-[11px] text-[var(--muted)]">Start a chat with someone from your matches</p>
                </div>
              </Link>
              <Link href="/friends" className="card p-4 flex items-center gap-3 hover:bg-[var(--surface-light)] transition-colors" style={{ border: '1px solid var(--glass-border)' }}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <Grid3X3 size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Browse all students</p>
                  <p className="text-[11px] text-[var(--muted)]">Find and message anyone from your campus</p>
                </div>
              </Link>
            </div>
          </div>

          {/* bottom spacer */}
          <div className="h-4" />
        </div>
      )}
    </div>
  );
}

/* ─── sub-components ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[var(--muted)] px-1">
      {children}
    </div>
  );
}

function ExploreTile({
  href, icon, title, subtitle, tag, tagColor,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: 'green' | 'amber' | 'blue';
}) {
  const tagClass = tagColor === 'green'
    ? 'bg-[rgba(34,197,94,0.14)] text-[var(--success)]'
    : tagColor === 'amber'
      ? 'bg-[rgba(234,179,8,0.14)] text-[var(--warning)]'
      : 'bg-[rgba(124,58,237,0.14)] text-[var(--primary-light)]';

  return (
    <Link href={href} className="card rounded-2xl px-2.5 py-3 text-center hover:bg-[var(--surface-light)] transition-colors" style={{ border: '1px solid var(--glass-border)' }}>
      <div className="text-lg mb-1">{typeof icon === 'string' ? icon : <span className="flex justify-center">{icon}</span>}</div>
      <p className="text-xs font-semibold text-[var(--foreground)]">{title}</p>
      <p className="text-[10px] text-[var(--muted)] mt-0.5">{subtitle}</p>
      <span className={`inline-block mt-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${tagClass}`}>
        {tag}
      </span>
    </Link>
  );
}
