// ============================================
// MitrAI - HOME Tab Page
// Greeting, quick stats, birthdays, schedule, quick actions
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { StudentProfile, BirthdayInfo } from '@/lib/types';
import BirthdayBanner from '@/components/BirthdayBanner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  Radar, Flame, MessageCircleMore, CircleDot,
  GraduationCap, ArrowLeftRight, DoorOpen, Users,
  Handshake, ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Birthdays
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        const userEmail = user?.email?.toLowerCase() || '';
        const mine = (data.data as StudentProfile[]).filter(
          (s: StudentProfile) => s.email?.toLowerCase() === userEmail
        );
        const savedId = localStorage.getItem('mitrai_student_id');
        const found = savedId ? mine.find((s: StudentProfile) => s.id === savedId) : mine[0];
        if (found) setStudent(found);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="stats" count={3} label="Loading home..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      {/* Greeting */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, <span className="gradient-text">{student?.name || user?.name || 'Student'}</span>
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {student?.department || 'SVNIT Surat'} &middot; {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>

      {user && birthdays.length > 0 && (
        <div className="mb-6">
          <BirthdayBanner
            birthdays={birthdays}
            currentUserId={user.id}
            wishedMap={wishedMap}
            onWish={handleWish}
          />
        </div>
      )}

      {/* Hero CTA — Find Your Study Buddy */}
      <Link href="/matches" className="block mb-7 rounded-xl bg-gradient-to-r from-[var(--primary)]/10 to-[var(--secondary)]/10 border border-[var(--primary)]/20 p-5 hover:border-[var(--primary)]/40 transition-all group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary-light)]">
              <Handshake size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Find Your <span className="gradient-text">Study Buddy</span></p>
              <p className="text-xs text-[var(--muted)] mt-0.5">AI-powered matching across 5 dimensions</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[var(--primary-light)] group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>

      {/* Primary Actions */}
      <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Explore</h2>
      <div className="grid grid-cols-2 gap-3 mb-7">
        {([
          { href: '/radar',   icon: Radar,             label: 'Campus Radar',   desc: 'Discover peers nearby', color: 'text-emerald-400', bg: 'bg-emerald-500/10', badge: 'NEW' },
          { href: '/doubts',  icon: Flame,             label: 'Campus Feed',    desc: 'Discussions & confessions', color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { href: '/anon',    icon: MessageCircleMore, label: 'Anonymous Chat', desc: 'Private conversations', color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { href: '/circles', icon: CircleDot,         label: 'Circles',        desc: 'Interest communities', color: 'text-rose-400', bg: 'bg-rose-500/10' },
        ] as const).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="card-hover p-4 flex flex-col items-center text-center relative group"
          >
            {'badge' in item && item.badge && (
              <span className="absolute top-2 right-2 text-[9px] font-bold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full tracking-wide">{item.badge}</span>
            )}
            <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center ${item.color} mb-2.5 group-hover:scale-105 transition-transform`}>
              <item.icon size={20} strokeWidth={1.8} />
            </div>
            <p className="text-xs font-semibold text-[var(--foreground)]">{item.label}</p>
            <p className="text-[10px] text-[var(--muted)] mt-0.5 leading-tight">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Secondary Actions */}
      <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Quick Access</h2>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {([
          { href: '/ratings', icon: GraduationCap,  label: 'Rate Prof',  color: 'text-amber-400', bg: 'bg-amber-500/10', badge: 'NEW' },
          { href: '/skills',  icon: ArrowLeftRight,  label: 'Skill Swap', color: 'text-cyan-400',  bg: 'bg-cyan-500/10' },
          { href: '/rooms',   icon: DoorOpen,        label: 'Rooms',      color: 'text-green-400', bg: 'bg-green-500/10' },
          { href: '/friends', icon: Users,           label: 'Friends',    color: 'text-blue-400',  bg: 'bg-blue-500/10' },
        ] as const).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="card-hover p-3 flex flex-col items-center text-center relative group"
          >
            {'badge' in item && item.badge && (
              <span className="absolute top-1 right-1 text-[7px] font-bold text-emerald-400 tracking-wide">{item.badge}</span>
            )}
            <div className={`w-8 h-8 rounded-md ${item.bg} flex items-center justify-center ${item.color} mb-1.5 group-hover:scale-105 transition-transform`}>
              <item.icon size={16} strokeWidth={1.8} />
            </div>
            <p className="text-[10px] font-medium text-[var(--foreground)]">{item.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
