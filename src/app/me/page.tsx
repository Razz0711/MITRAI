// ============================================
// MitrAI - ME Tab Page (Redesigned)
// Profile card, stats, invite, notifications
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { StudentProfile } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function MePage() {
  const { user, logout } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const [circleCount, setCircleCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [topMatch, setTopMatch] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [subscription, setSubscription] = useState<{ plan: string; status: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [studentRes, matchRes, circleRes] = await Promise.all([
        fetch(`/api/students?id=${encodeURIComponent(user.id)}`),
        fetch(`/api/match?userId=${encodeURIComponent(user.id)}`),
        fetch(`/api/circles?userId=${user.id}`),
      ]);

      const studentData = await studentRes.json();
      if (studentData.success) setStudent(studentData.data as StudentProfile);

      const matchData = await matchRes.json();
      if (matchData.success) {
        const matches = matchData.data?.matches || matchData.data || [];
        setMatchCount(Array.isArray(matches) ? matches.length : 0);
        if (Array.isArray(matches) && matches.length > 0) {
          const topScore = Math.max(...matches.map((m: { score?: { overall?: number } }) => m.score?.overall || 0));
          setTopMatch(Math.round(topScore));
        }
      }

      const circleData = await circleRes.json();
      if (circleData.success) {
        const memberships = circleData.data?.memberships || [];
        setCircleCount(memberships.length);
      }

      // Try to get subscription info
      try {
        const subRes = await fetch(`/api/subscription?userId=${user.id}`);
        const subData = await subRes.json();
        if (subData.success && subData.data) {
          setSubscription({ plan: subData.data.plan || 'free', status: subData.data.status || 'active' });
        }
      } catch { /* ignore */ }

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, loadData]);

  const referralCode = student?.admissionNumber || user?.id?.slice(0, 8) || 'svnit';
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${referralCode}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const msg = encodeURIComponent(`Hey! Join MitrAI \u2014 find study buddies at SVNIT\n${referralLink}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={3} label="Loading profile..." />
      </div>
    );
  }

  const planLabel = subscription?.plan === 'monthly' ? 'Monthly' : subscription?.plan === 'yearly' ? 'Yearly' : 'Free plan';

  // Circle names the user has joined (from student data)
  const circleTags = student?.strongSubjects?.slice(0, 2).map(s => `${s} Circle`) || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

      {/* ═══════ PROFILE CARD ═══════ */}
      <div className="card p-5" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full shrink-0 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[var(--primary)]/20">
            {(student?.name || user?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate text-[var(--foreground)]">
              {student?.name || user?.name || 'Student'}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {student?.department || 'SVNIT Surat'}
              {student?.yearLevel ? ` · ${student.yearLevel}` : ''}
              {' · SVNIT'}
            </p>
          </div>
          <Link
            href="/onboarding"
            className="text-xs text-[var(--foreground)] font-medium px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-white/5 transition-colors shrink-0"
          >
            Edit
          </Link>
        </div>

        {/* Circle Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {circleTags.map((tag, i) => (
            <span key={i} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/20">
              {tag}
            </span>
          ))}
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
            Active
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <div className="text-center py-3">
            <div className="text-lg font-bold text-[var(--foreground)]">{matchCount}</div>
            <div className="text-[10px] text-[var(--muted)]">Matches</div>
          </div>
          <div className="text-center py-3 border-l border-[var(--border)]">
            <div className="text-lg font-bold text-[var(--foreground)]">{circleCount}</div>
            <div className="text-[10px] text-[var(--muted)]">Circles</div>
          </div>
          <div className="text-center py-3 border-l border-[var(--border)]">
            <div className="text-lg font-bold text-[var(--foreground)]">{sessionCount}</div>
            <div className="text-[10px] text-[var(--muted)]">Sessions</div>
          </div>
          <div className="text-center py-3 border-l border-[var(--border)]">
            <div className="text-lg font-bold text-[var(--foreground)]">{topMatch > 0 ? `${topMatch}%` : '—'}</div>
            <div className="text-[10px] text-[var(--muted)]">Top match</div>
          </div>
        </div>
      </div>

      {/* ═══════ PRO SUBSCRIPTION ═══════ */}
      <Link href="/subscription" className="block">
        <div className="card p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-lg">⭐</div>
          <div className="flex-1">
            <span className="text-sm font-bold text-[var(--foreground)]">Pro Subscription</span>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            subscription?.plan !== 'free' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-green-500/15 text-green-400 border-green-500/25'
          }`}>
            {planLabel}
          </span>
          <span className="text-[var(--muted)] text-xs">›</span>
        </div>
      </Link>

      {/* ═══════ INVITE BATCHMATES ═══════ */}
      <div className="card p-5 space-y-4" style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎁</span>
            <span className="text-sm font-bold text-[var(--foreground)]">Invite Batchmates</span>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[var(--primary)]/20 text-[var(--primary-light)]">
            1 month Pro / invite
          </span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--muted)]">Progress to next Pro month</span>
            <span className="text-xs font-bold text-[var(--foreground)]">0 / 5 joined</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--surface-light)]">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-blue-500" style={{ width: '0%' }} />
          </div>
          <p className="text-[10px] text-[var(--muted)] mt-1.5">
            <strong className="text-[var(--primary-light)]">5 more</strong> friends needed to unlock 1 month Pro free
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <div className="text-center py-3">
            <div className="text-lg font-bold text-[var(--foreground)]">0</div>
            <div className="text-[10px] text-[var(--muted)]">Link clicks</div>
          </div>
          <div className="text-center py-3 border-l border-[var(--border)]">
            <div className="text-lg font-bold text-[var(--foreground)]">0</div>
            <div className="text-[10px] text-[var(--muted)]">Joined</div>
          </div>
          <div className="text-center py-3 border-l border-[var(--border)]">
            <div className="text-lg font-bold text-[var(--primary-light)]">0</div>
            <div className="text-[10px] text-[var(--muted)]">Pro months earned</div>
          </div>
        </div>

        {/* Who joined section */}
        <div>
          <h3 className="text-[10px] font-bold tracking-[0.12em] uppercase text-[var(--muted)] mb-2">WHO JOINED FROM YOUR LINK</h3>
          <div className="p-4 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            <p className="text-xs text-[var(--muted)]">No one has joined yet. Share your link!</p>
          </div>
        </div>

        {/* CTA */}
        <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(245,158,11,0.06))', border: '1px solid rgba(124,58,237,0.15)' }}>
          <span className="text-base mt-0.5">⚡</span>
          <p className="text-xs text-[var(--foreground)]">
            Invite <strong>5 batchmates</strong> to unlock <strong className="text-[var(--primary-light)]">1 month Pro free</strong>.
            Drop your link in the class WhatsApp group!
          </p>
        </div>

        {/* Referral link */}
        <div className="bg-[var(--surface)] rounded-xl px-3 py-2.5 text-[11px] text-[var(--muted)] truncate border border-[var(--border)]">
          {referralLink}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopyLink}
            className="py-2.5 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--foreground)] hover:bg-white/5 transition-colors"
          >
            {copySuccess ? '✓ Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="py-2.5 rounded-xl text-xs font-bold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
          >
            Share on WhatsApp
          </button>
        </div>
      </div>

      {/* ═══════ NOTIFICATIONS ═══════ */}
      <Link href="/home" className="block">
        <div className="card p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-lg">🔔</div>
          <div className="flex-1">
            <span className="text-sm font-bold text-[var(--foreground)]">Notifications</span>
            <p className="text-[10px] text-[var(--muted)]">Manage your alerts</p>
          </div>
          <span className="text-[var(--muted)] text-xs">›</span>
        </div>
      </Link>

      {/* ═══════ SIGN OUT ═══════ */}
      {user && (
        <button
          onClick={logout}
          className="w-full card py-3.5 text-center text-sm font-semibold text-red-400 hover:bg-red-500/5 transition-colors"
          style={{ border: '1px solid rgba(239,68,68,0.15)' }}
        >
          Sign Out
        </button>
      )}

      {/* ═══════ FOOTER ═══════ */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-[var(--muted)] pb-6">
        <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy</Link>
        <span>·</span>
        <span>MitrAI v1.0</span>
      </div>
    </div>
  );
}
