'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { BirthdayInfo, ChatThread, StudentProfile } from '@/lib/types';
import BirthdayBanner from '@/components/BirthdayBanner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  ArrowRight,
  Compass,
  Clock,
  GraduationCap,
  Handshake,
  LifeBuoy,
  MapPin,
  MessageCircleMore,
  MoonStar,
  Radio,
  Send,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';

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

const ACTIVITIES: Record<string, { label: string; color: string }> = {
  'study-dsa': { label: 'DSA Practice', color: '#7c3aed' },
  'study-math': { label: 'Math Study', color: '#06b6d4' },
  'study-general': { label: 'General Study', color: '#3b82f6' },
  'music': { label: 'Music Jam', color: '#ec4899' },
  'cricket': { label: 'Cricket', color: '#22c55e' },
  'gym': { label: 'Gym Buddy', color: '#f59e0b' },
  'gaming': { label: 'Gaming', color: '#8b5cf6' },
  chai: { label: 'Chai and Chat', color: '#f97316' },
  walk: { label: 'Evening Walk', color: '#14b8a6' },
  movie: { label: 'Watch Movie', color: '#e11d48' },
  food: { label: 'Food Run', color: '#ea580c' },
  hangout: { label: 'Just Hangout', color: '#6366f1' },
};

export default function HomePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pings, setPings] = useState<RadarPing[]>([]);
  const [pingsLoading, setPingsLoading] = useState(true);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [anonStats, setAnonStats] = useState<AnonStats | null>(null);
  const [birthdays, setBirthdays] = useState<BirthdayInfo[]>([]);
  const [wishedMap, setWishedMap] = useState<Record<string, boolean>>({});

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    if (!user) return;
    loadData();
    loadBirthdays();
    loadSnapshot();

    const interval = setInterval(() => {
      loadSnapshot();
    }, 15000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success) {
        setStudent(data.data as StudentProfile);
      }
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
    } catch {
      // ignore
    }
  }, [user]);

  const loadSnapshot = async () => {
    if (!user) return;

    try {
      const [radarRes, chatRes, anonRes] = await Promise.all([
        fetch(`/api/radar?userId=${user.id}`),
        fetch(`/api/chat?userId=${user.id}`),
        fetch('/api/anon?check=stats'),
      ]);

      const [radarData, chatData, anonData] = await Promise.all([
        radarRes.json(),
        chatRes.json(),
        anonRes.json(),
      ]);

      if (radarData?.success) {
        setPings(radarData.data?.pings || []);
      }

      if (Array.isArray(chatData?.threads)) {
        setThreads(chatData.threads as ChatThread[]);
      }

      if (anonData?.success) {
        setAnonStats(anonData.data as AnonStats);
      }
    } catch {
      // ignore
    } finally {
      setPingsLoading(false);
      setThreadsLoading(false);
    }
  };

  const handleWish = async (toUserId: string, toUserName: string) => {
    if (!user) return;
    try {
      await fetch('/api/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, fromUserName: user.name, toUserId, toUserName }),
      });
    } catch {
      // ignore
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const formatThreadTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || 'S';

  const getOtherUser = (thread: ChatThread) => {
    if (thread.user1Id === user?.id) {
      return { id: thread.user2Id, name: thread.user2Name, unread: thread.unreadCount1 };
    }
    return { id: thread.user1Id, name: thread.user1Name, unread: thread.unreadCount2 };
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="stats" count={3} label="Loading home..." />
      </div>
    );
  }

  const firstName = (student?.name || user?.name || 'Student').split(' ')[0];
  const branch = student?.department || user?.department || 'Not set';
  const year = student?.yearLevel || user?.yearLevel || 'Not set';
  const liveOthers = pings.filter((ping) => ping.userId !== user?.id);
  const liveCampusCount = liveOthers.length;
  const topPings = liveOthers.slice(0, 3);
  const topUrgentPing = topPings[0] || null;
  const unreadTotal = threads.reduce((sum, thread) => {
    if (thread.user1Id === user?.id) return sum + thread.unreadCount1;
    return sum + thread.unreadCount2;
  }, 0);
  const recentThreads = threads.slice(0, 3);
  const anonLiveTotal = (anonStats?.queueCount || 0) + (anonStats?.activeRooms || 0) * 2;
  const activeStudentsSignal = new Set(liveOthers.map((p) => p.userId)).size + anonLiveTotal;
  const isCampusQuiet = liveCampusCount === 0;

  return (
    <div className="home-polish max-w-3xl mx-auto px-4 py-5 space-y-5 relative">
      <div className="home-aura home-aura-1" />
      <div className="home-aura home-aura-2" />
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />

      <div className="slide-up space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              <Sparkles size={12} className="text-[var(--accent)]" />
              Campus pulse home
            </div>
            <div className="mt-3 mb-1">
              <h1 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-1">
                {getGreeting()},
              </h1>
              <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
                <span className="gradient-text">{firstName}</span>
              </h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {branch} - {year}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="profile-chip">🎓 {branch}</span>
              <span className="profile-chip">📅 {year}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
            <MetricCard label="Online" value={`${liveCampusCount}`} hint="Need-based pings" />
            <MetricCard label="Anon" value={`${anonLiveTotal}`} hint="Queue + active rooms" />
            <MetricCard label="Unread" value={`${unreadTotal}`} hint="Messages waiting" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="pulse-pill pulse-neutral">
            <span className={`h-2 w-2 rounded-full ${isCampusQuiet ? 'bg-[var(--muted)]' : 'bg-[var(--success)] animate-pulse'}`} />
            {isCampusQuiet ? 'Campus quiet now' : `${liveCampusCount} students need help now`}
          </span>
          <span className="pulse-pill pulse-pink">
            <MoonStar size={12} className="text-[var(--accent)]" />
            {anonLiveTotal} in anon chat
          </span>
          <span className="pulse-pill pulse-blue">
            <MessageCircleMore size={12} className="text-[var(--primary-light)]" />
            {unreadTotal > 0 ? `${unreadTotal} unread DMs` : 'DM inbox clear'}
          </span>
        </div>
      </div>

      {user && birthdays.length > 0 && (
        <div className="slide-up-stagger-1">
          <BirthdayBanner
            birthdays={birthdays}
            currentUserId={user.id}
            wishedMap={wishedMap}
            onWish={handleWish}
          />
        </div>
      )}

      <section className="card-glass tone-card p-5 sm:p-6 slide-up-stagger-2">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-light)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              <UserCheck size={12} className="text-[var(--primary-light)]" />
              Who is online and what they need
            </div>
            {topUrgentPing ? (
              <>
                <h3 className="mt-3 text-xl font-bold text-[var(--foreground)]">
                  {topUrgentPing.isAnonymous ? 'Someone' : topUrgentPing.userName} is online now looking for {ACTIVITIES[topUrgentPing.activityId]?.label || 'help'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {topUrgentPing.note
                    ? `"${topUrgentPing.note}"`
                    : 'Live intent posted on campus radar. Tap once and continue the conversation in chat.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!topUrgentPing.isAnonymous ? (
                    <Link
                      href={`/chat?friendId=${encodeURIComponent(topUrgentPing.userId)}&friendName=${encodeURIComponent(topUrgentPing.userName)}`}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      Message now
                      <Send size={15} />
                    </Link>
                  ) : (
                    <Link href="/radar" className="btn-primary inline-flex items-center gap-2">
                      Open radar
                      <ArrowRight size={15} />
                    </Link>
                  )}
                  <Link href="/radar" className="btn-secondary inline-flex items-center gap-2">
                    See all live intents
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h3 className="mt-3 text-xl font-bold text-[var(--foreground)]">
                  No live intents yet, you can start the first one
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Tell campus what you need right now in one tap and let nearby students discover you.
                </p>
                <div className="mt-4">
                  <Link href="/radar" className="btn-primary inline-flex items-center gap-2">
                    Broadcast my intent
                    <Compass size={15} />
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[320px]">
            <InfoTile label="Matching basis" value={`${branch} - ${year}`} />
            <InfoTile label="Campus signals" value={`${activeStudentsSignal} active students`} />
          </div>
        </div>
      </section>

      <SectionLabel>Live on campus</SectionLabel>
      <section className="grid gap-3 sm:grid-cols-2 slide-up-stagger-3">
        <ActionCard
          href="/radar"
          eyebrow="One-tap ask"
          title="I need help right now"
          description="Broadcast instantly for study sessions, chai breaks, or quick academic help."
          icon={<Radio size={18} />}
        />
        <ActionCard
          href="/anon"
          eyebrow="2am safe space"
          title="Vent anonymously"
          description="Open anon chat for pressure, stress, confessions, and late-night support."
          icon={<LifeBuoy size={18} />}
        />
      </section>

      <SectionLabel>Usage proof</SectionLabel>
      <section className="slide-up-stagger-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <span className="w-2.5 h-2.5 bg-[var(--success)] rounded-full inline-block" />
              <span className="w-2.5 h-2.5 bg-[var(--success)] rounded-full inline-block absolute inset-0 animate-ping opacity-50" />
            </div>
            <div>
              <h3 className="text-base font-bold">Proof students are using this</h3>
              <p className="text-xs text-[var(--muted)]">Real counts beat empty pages. Even small numbers build trust.</p>
            </div>
          </div>
          <Link href="/radar" className="text-xs font-semibold text-[var(--primary-light)] hover:text-[var(--primary)] transition-colors flex items-center gap-1">
            Live feed <ArrowRight size={14} />
          </Link>
        </div>

        {pingsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="card p-4 shimmer h-20 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile
              label="Live intents now"
              value={`${liveCampusCount}`}
              hint="Students currently broadcasting needs"
              icon={<Radio size={15} />}
            />
            <StatTile
              label="Anon users live"
              value={`${anonLiveTotal}`}
              hint={`${anonStats?.activeRooms || 0} active rooms, ${anonStats?.queueCount || 0} waiting`}
              icon={<MoonStar size={15} />}
            />
            <StatTile
              label="Open DMs"
              value={`${threads.length}`}
              hint={`${unreadTotal} unread messages`}
              icon={<MessageCircleMore size={15} />}
            />
            <StatTile
              label="Matches basis"
              value="Branch + Year"
              hint="Fast and explainable matching"
              icon={<Handshake size={15} />}
            />
          </div>
        )}
      </section>

      <SectionLabel>Direct messages</SectionLabel>
      <section className="slide-up-stagger-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">Your conversations</h3>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">{threads.length} chats · {unreadTotal} unread</p>
          </div>
          {unreadTotal > 0 && (
            <span className="rounded-md bg-[var(--primary-light)] text-white text-[11px] font-bold px-2.5 py-1">
              {unreadTotal} unread
            </span>
          )}
          <Link href="/chat" className="text-[11px] font-semibold text-[var(--primary-light)] hover:text-[var(--primary)] transition-colors">
            Open all chats
          </Link>
        </div>

        {threadsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="card p-4 shimmer h-16 rounded-2xl" />
            ))}
          </div>
        ) : recentThreads.length === 0 ? (
          <div className="card-glass p-6 text-center">
            <p className="text-sm font-semibold mb-1">No conversations yet</p>
            <p className="text-xs text-[var(--muted)] mb-4">Open your matches and message someone in one tap.</p>
            <Link href="/matches" className="btn-primary text-xs inline-flex items-center gap-2">
              See my matches <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentThreads.map((thread) => {
              const other = getOtherUser(thread);
              return (
                <Link
                  key={thread.chatId}
                  href={`/chat?friendId=${encodeURIComponent(other.id)}&friendName=${encodeURIComponent(other.name)}`}
                  className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-2.5 flex items-center gap-3 transition-all duration-200 hover:border-[var(--border)] hover:bg-[var(--surface-light)]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 text-[var(--primary-light)] flex items-center justify-center font-bold">
                    {getInitial(other.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold truncate">{other.name}</p>
                      <span className="text-[10px] text-[var(--muted)] shrink-0">{formatThreadTime(thread.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-[var(--muted)] truncate">{thread.lastMessage || 'Say hi and start the conversation.'}</p>
                  </div>
                  {other.unread > 0 && (
                    <span className="text-[10px] font-bold rounded-full bg-[var(--primary)] text-white px-2 py-1">{other.unread}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <SectionLabel>Core actions</SectionLabel>
      <section className="slide-up-stagger-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Everything else</h3>
          <span className="text-[10px] text-[var(--muted)]">Built for fast decisions</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            href="/matches"
            eyebrow="Primary path"
            title="See my matches"
            description="Ranked students from your branch and year with direct chat entry."
            icon={<GraduationCap size={18} />}
          />
          <ActionCard
            href="/rooms"
            eyebrow="Group study"
            title="Join study rooms"
            description="Switch from one-on-one to small focused groups when needed."
            icon={<Users size={18} />}
          />
          <ActionCard
            href="/friends"
            eyebrow="People"
            title="Manage network"
            description="Keep your core study circle close and discover trusted peers."
            icon={<Handshake size={18} />}
          />
        </div>
      </section>

      <section className="card-glass tone-card p-5 sm:p-6 slide-up-stagger-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--warning)]/15 text-[var(--warning)] flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold text-[var(--muted)]">Reality check</p>
            <h3 className="text-base font-bold mt-1">The first 10 seconds should show live intent, not just features</h3>
            <p className="text-sm text-[var(--muted)] mt-2">
              This home now prioritizes: who needs what right now, one-tap ask flow, anonymous vent entry, and proof of active usage.
            </p>
          </div>
        </div>
      </section>

      <div className="h-4" />

      {topPings.length > 0 && (
        <section className="slide-up-stagger-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Live intents right now</h3>
            <Link href="/radar" className="text-[11px] font-semibold text-[var(--primary-light)] hover:text-[var(--primary)] transition-colors">
              Open radar
            </Link>
          </div>
          <div className="space-y-2">
            {topPings.map((ping) => {
              const act = ACTIVITIES[ping.activityId];
              return (
                <div key={ping.id} className="card p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${act?.color || '#7c3aed'}20`, color: act?.color || '#a78bfa' }}>
                    {act?.label?.charAt(0) || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {ping.isAnonymous ? 'Someone' : ping.userName} wants {act?.label || 'help'}
                    </p>
                    <p className="text-xs text-[var(--muted)] truncate inline-flex items-center gap-1">
                      <MapPin size={11} /> {ping.zone} • {timeAgo(ping.createdAt)}
                    </p>
                  </div>
                  {!ping.isAnonymous && (
                    <Link
                      href={`/chat?friendId=${encodeURIComponent(ping.userId)}&friendName=${encodeURIComponent(ping.userName)}`}
                      className="text-xs font-semibold text-[var(--primary-light)] hover:text-[var(--primary)]"
                    >
                      Message
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <SectionLabel>Explore</SectionLabel>
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 slide-up-stagger-4">
        <MiniTile
          href="/circles"
          icon="⬤"
          title="Circles"
          subtitle="Communities"
          tag="7 joined"
          tone="blue"
        />
        <MiniTile
          href="/rooms"
          icon="🚪"
          title="Rooms"
          subtitle="Study groups"
          tag="1 active"
          tone="green"
        />
        <MiniTile
          href="/skills"
          icon="🔁"
          title="Skill Swap"
          subtitle="Teach & learn"
          tag="Soon"
          tone="amber"
        />
        <MiniTile
          href="/subscription"
          icon="⭐"
          title="Pro"
          subtitle="More features"
          tag="Upgrade"
          tone="amber"
        />
      </section>

      <section className="invite-strip slide-up-stagger-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--warning)] font-bold">Grow your campus</p>
          <h3 className="text-sm font-bold mt-1">Invite your batchmates</h3>
          <p className="text-xs text-[var(--muted)] mt-1">More students means better live intent + better matching.</p>
        </div>
        <Link href="/me" className="btn-secondary text-xs px-3 py-2 shrink-0">
          Share invite
        </Link>
      </section>

      <style jsx>{`
        .home-polish {
          z-index: 1;
        }

        .profile-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: color-mix(in srgb, var(--surface) 94%, transparent);
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .home-aura {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(56px);
          opacity: 0.14;
          z-index: 0;
        }

        .home-aura-1 {
          width: 300px;
          height: 220px;
          top: -70px;
          right: -110px;
          background: rgba(99, 102, 241, 0.36);
        }

        .home-aura-2 {
          width: 260px;
          height: 190px;
          left: -100px;
          top: 180px;
          background: rgba(236, 72, 153, 0.2);
        }

        .pulse-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 5px 12px;
          border: 1px solid var(--glass-border);
          background: color-mix(in srgb, var(--surface) 92%, transparent);
          color: var(--muted);
        }

        .pulse-pink {
          border-color: rgba(236, 72, 153, 0.24);
          background: rgba(236, 72, 153, 0.09);
          color: #f9a8d4;
        }

        .pulse-blue {
          border-color: rgba(124, 58, 237, 0.24);
          background: rgba(124, 58, 237, 0.1);
          color: #c4b5fd;
        }

        .pulse-neutral {
          border-color: color-mix(in srgb, var(--glass-border) 100%, transparent);
        }

        .tone-card {
          border-color: color-mix(in srgb, var(--glass-border) 100%, transparent);
          background: linear-gradient(
              135deg,
              color-mix(in srgb, var(--surface) 94%, transparent),
              color-mix(in srgb, var(--surface) 86%, transparent)
            );
        }

        .invite-strip {
          border: 1px solid var(--glass-border);
          background: color-mix(in srgb, var(--surface) 92%, transparent);
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        :global(.home-polish .card-hover:hover) {
          border-color: rgba(129, 140, 248, 0.45);
          transform: translateY(-1px);
        }

        @media (max-width: 640px) {
          .home-aura-1,
          .home-aura-2 {
            opacity: 0.1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-aura-1,
          .home-aura-2 {
            display: none;
          }

          :global(.home-polish .card-hover:hover) {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-bold text-[var(--foreground)]">{value}</p>
      <p className="text-[10px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
        <span className="text-[var(--primary-light)]">{icon}</span>
      </div>
      <p className="mt-2 text-lg font-bold text-[var(--foreground)]">{value}</p>
      <p className="text-[10px] text-[var(--muted)] mt-1">{hint}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--surface)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function ActionCard({
  href,
  eyebrow,
  title,
  description,
  icon,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="card-hover p-4 group rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{eyebrow}</p>
          <h3 className="mt-2 text-sm font-bold text-[var(--foreground)]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/12 text-[var(--primary-light)] transition-transform duration-300 group-hover:scale-105">
          {icon}
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary-light)]">
        Open
        <ArrowRight size={14} />
      </div>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[var(--muted)] px-1">
      {children}
    </div>
  );
}

function MiniTile({
  href,
  icon,
  title,
  subtitle,
  tag,
  tone,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  tag: string;
  tone: 'blue' | 'green' | 'amber';
}) {
  const tagClass = tone === 'green'
    ? 'bg-[rgba(34,197,94,0.14)] text-[var(--success)]'
    : tone === 'amber'
      ? 'bg-[rgba(234,179,8,0.14)] text-[var(--warning)]'
      : 'bg-[rgba(124,58,237,0.14)] text-[var(--primary-light)]';

  return (
    <Link href={href} className="card-hover rounded-2xl px-2.5 py-3 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <p className="text-xs font-semibold text-[var(--foreground)]">{title}</p>
      <p className="text-[10px] text-[var(--muted)] mt-0.5">{subtitle}</p>
      <span className={`inline-block mt-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${tagClass}`}>
        {tag}
      </span>
    </Link>
  );
}
