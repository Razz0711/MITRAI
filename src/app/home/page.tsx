// ============================================
// MitrAI - HOME Tab Page
// Greeting, quick stats, birthdays, schedule, quick actions
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { StudentProfile } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function HomePage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    if (!user) return;
    loadData();
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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="stats" count={3} label="Loading home..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-bold">
          {getGreeting()}, <span className="gradient-text">{student?.name || user?.name || 'Student'}</span> 👋
        </h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {student?.department || 'SVNIT Surat'} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>


      {/* Hero CTA — Find Your Study Buddy */}
      <Link href="/matches" className="card p-5 mb-4 block border-[var(--primary)]/30 hover:border-[var(--primary)]/60 transition-all group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">🤝 Find Your <span className="gradient-text">Study Buddy</span></p>
            <p className="text-xs text-[var(--muted)] mt-1">AI-powered matching across 5 dimensions</p>
          </div>
          <span className="text-xs text-[var(--primary-light)] font-medium group-hover:translate-x-0.5 transition-transform">Match Now →</span>
        </div>
      </Link>

      {/* Primary Actions */}
      <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/radar" className="card-hover p-4 text-center block border-green-500/20 relative overflow-hidden">
          <span className="absolute top-1.5 right-1.5 text-[8px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">NEW</span>
          <span className="text-2xl mb-1 block">📡</span>
          <p className="text-xs font-semibold">Campus Radar</p>
          <p className="text-[10px] text-[var(--muted)]">See who&apos;s around you</p>
        </Link>
        <Link href="/doubts" className="card-hover p-4 text-center block border-orange-500/20">
          <span className="text-2xl mb-1 block">🔥</span>
          <p className="text-xs font-semibold">Campus Feed</p>
          <p className="text-[10px] text-[var(--muted)]">Confessions & hot takes</p>
        </Link>
        <Link href="/anon" className="card-hover p-4 text-center block border-purple-500/20">
          <span className="text-2xl mb-1 block">🎭</span>
          <p className="text-xs font-semibold">Anonymous Chat</p>
          <p className="text-[10px] text-[var(--muted)]">Talk freely, no names</p>
        </Link>
        <Link href="/circles" className="card-hover p-4 text-center block">
          <span className="text-2xl mb-1 block">⭕</span>
          <p className="text-xs font-semibold">Circles</p>
          <p className="text-[10px] text-[var(--muted)]">Interest communities</p>
        </Link>
      </div>

      {/* More Actions */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <Link href="/skills" className="card-hover p-3 text-center block relative">
          <span className="absolute top-0.5 right-0.5 text-[7px] font-bold text-green-400">NEW</span>
          <span className="text-lg block mb-0.5">🔄</span>
          <p className="text-[10px] font-medium">Skill Swap</p>
        </Link>
        <Link href="/rooms" className="card-hover p-3 text-center block">
          <span className="text-lg block mb-0.5">📚</span>
          <p className="text-[10px] font-medium">Rooms</p>
        </Link>
        <Link href="/circles" className="card-hover p-3 text-center block">
          <span className="text-lg block mb-0.5">⭕</span>
          <p className="text-[10px] font-medium">Circles</p>
        </Link>
        <Link href="/friends" className="card-hover p-3 text-center block">
          <span className="text-lg block mb-0.5">👥</span>
          <p className="text-[10px] font-medium">Friends</p>
        </Link>
      </div>


    </div>
  );
}
