// ============================================
// MitrrAi - ME Page (IOC-style Redesign)
// Profile + Account + Preferences + Support
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { StudentProfile, FriendRequest } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { X, Star, Globe, Shield, MessageSquare, HelpCircle, Pencil, Camera, UserPlus, ArrowLeft } from 'lucide-react';

export default function MePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const [circleCount, setCircleCount] = useState(0);
  const [topMatch, setTopMatch] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [zoomPhoto, setZoomPhoto] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [studentRes, matchRes, circleRes, friendsRes] = await Promise.all([
        fetch(`/api/students?id=${encodeURIComponent(user.id)}`),
        fetch(`/api/match?userId=${encodeURIComponent(user.id)}`),
        fetch(`/api/circles?userId=${user.id}`),
        fetch(`/api/friends?userId=${user.id}`),
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

      const friendsData = await friendsRes.json();
      if (friendsData.success && friendsData.data.pendingRequests) {
        setPendingRequests(friendsData.data.pendingRequests);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user, loadData]);


  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={3} label="Loading profile..." />
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const fullName = student?.name || user?.name || 'Student';
  const _firstName = fullName.split(' ')[0];
  const isFemaleUser = student?.gender === 'Female';
  const companionName = isFemaleUser ? 'Aryan' : 'Arya';
  const _logoutEmoji = isFemaleUser ? '😢' : '🥺';
  const logoutMessage = isFemaleUser
    ? `${companionName} will be here whenever you come back. Your conversations and progress are saved.`
    : `${companionName} will be here whenever you come back. Your conversations and progress are saved.`;
  const stayButton = 'Stay';

  const department = student?.department || 'College';
  const yearLevel = student?.yearLevel || '';

  return (
    <div className="max-w-lg mx-auto px-4 pb-28 space-y-5 page-enter" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/home"
            className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted-strong)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Me</h1>
        </div>
        <Link
          href="/me/edit"
          className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted-strong)] hover:text-[var(--foreground)] transition-colors"
        >
          <Pencil size={16} />
        </Link>
      </div>

      {/* ═══ PROFILE CARD ═══ */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
        {/* Gradient banner */}
        <div className="h-20 relative" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.5) 0%, rgba(59,130,246,0.3) 50%, rgba(168,85,247,0.4) 100%)' }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(124,58,237,0.4) 0%, transparent 70%)' }} />
        </div>

        <div className="px-5 pb-5">
          {/* Avatar row — overlapping the banner */}
          <div className="flex items-end gap-4 -mt-8 mb-3">
            <div className="relative shrink-0">
              {student?.photoUrl ? (
                <Image
                  src={student.photoUrl}
                  alt={fullName}
                  width={72}
                  height={72}
                  className="w-18 h-18 rounded-full object-cover shadow-xl ring-3 ring-[var(--background)] cursor-pointer transition-transform active:scale-95"
                  style={{ width: 72, height: 72, border: '3px solid var(--background)' }}
                  onClick={() => setZoomPhoto(true)}
                  unoptimized
                />
              ) : (
                <div
                  className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-bold text-2xl shadow-xl cursor-pointer transition-transform active:scale-95"
                  style={{ border: '3px solid var(--background)' }}
                  onClick={() => setZoomPhoto(true)}
                >
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={() => setZoomPhoto(true)}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-violet-600 border-2 border-[var(--background)] flex items-center justify-center text-white"
              >
                <Camera size={10} />
              </button>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-base font-bold truncate text-[var(--foreground)]">{fullName}</h2>
              <p className="text-xs text-[var(--muted-strong)] mt-0.5">
                {department}{yearLevel ? ` · ${yearLevel}` : ''}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            College Verified
          </span>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
            <Link href="/friends" className="text-center py-3 hover:bg-white/5 transition-colors">
              {matchCount > 0 ? (
                <>
                  <div className="text-lg font-bold text-[var(--foreground)] count-up">{matchCount}</div>
                  <div className="text-[11px] text-[var(--muted-strong)]">Matches</div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-bold text-violet-400 leading-tight">Find</div>
                  <div className="text-[11px] text-[var(--muted-strong)]">Matches</div>
                </>
              )}
            </Link>
            <Link href="/circles" className="text-center py-3 border-l border-[var(--border)] hover:bg-white/5 transition-colors">
              {circleCount > 0 ? (
                <>
                  <div className="text-lg font-bold text-[var(--foreground)] count-up">{circleCount}</div>
                  <div className="text-[11px] text-[var(--muted-strong)]">Circles</div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-bold text-violet-400 leading-tight">Join</div>
                  <div className="text-[11px] text-[var(--muted-strong)]">Circles</div>
                </>
              )}
            </Link>
            <div className="text-center py-3 border-l border-[var(--border)]">
              <div className="text-lg font-bold text-[var(--foreground)] count-up">{topMatch > 0 ? `${topMatch}%` : '—'}</div>
              <div className="text-[11px] text-[var(--muted-strong)]">Top match</div>
            </div>
          </div>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div className="animate-appear">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)] px-1 mb-2">Pending Requests ({pendingRequests.length})</p>
          <div className="rounded-2xl overflow-hidden divide-y divide-[var(--border)]" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-white font-bold shrink-0 shadow-md">
                  {req.fromUserName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--foreground)] truncate">{req.fromUserName}</p>
                  <p className="text-[11px] text-[var(--muted-strong)] truncate">Sent you a friend request</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button 
                    onClick={async () => {
                      await fetch('/api/friends', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: req.id, status: 'declined' }) });
                      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                    }}
                    className="p-2 rounded-xl text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <button 
                    onClick={async () => {
                      await fetch('/api/friends', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: req.id, status: 'accepted' }) });
                      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-500/20 transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {zoomPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setZoomPhoto(false)}>
          <button
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setZoomPhoto(false); }}
          >
            <X size={24} />
          </button>
          {student?.photoUrl ? (
            <Image
              src={student.photoUrl}
              alt={fullName}
              width={384}
              height={384}
              className="w-64 h-64 md:w-96 md:h-96 rounded-full border-4 border-white/20 object-cover shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              unoptimized
            />
          ) : (
            <div
              className="w-64 h-64 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 border-4 border-white/20 flex items-center justify-center text-white font-bold text-6xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* ═══ ACCOUNT SECTION ═══ */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)] px-1 mb-2">ACCOUNT</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          {/* Pro Subscription */}
          <Link href="/subscription" className="flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center"><Star size={18} className="text-amber-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--foreground)]">Pro Subscription</p>
              <p className="text-[11px] text-[var(--muted-strong)]">Unlock unlimited matches & {companionName} AI</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/25">Upgrade</span>
            <span className="text-[var(--muted-strong)] text-xs ml-1">›</span>
          </Link>

          <div className="h-px bg-[var(--border)]" />

          {/* Invite Friends */}
          <button
            onClick={() => {
              const msg = encodeURIComponent(`Hey! Join MitrrAi — find study buddies at your college\nhttps://mitrrai.in`);
              window.open(`https://wa.me/?text=${msg}`, '_blank');
            }}
            className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center"><UserPlus size={18} className="text-emerald-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--foreground)]">Invite Friends</p>
              <p className="text-[11px] text-[var(--muted-strong)]">5 invites = 1 month Pro free</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-emerald-400">0/5</p>
              <p className="text-[11px] text-[var(--muted-strong)]">joined</p>
            </div>
            <span className="text-[var(--muted-strong)] text-xs ml-1">›</span>
          </button>
        </div>
      </div>

      {/* ═══ PREFERENCES SECTION ═══ */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)] px-1 mb-2">PREFERENCES</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          {/* Change Language */}
          <Link href="/me/language" className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center"><Globe size={18} className="text-blue-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Change Language</p>
              <p className="text-[11px] text-[var(--muted-strong)]">English (default)</p>
            </div>
            <span className="text-[var(--muted-strong)] text-xs">›</span>
          </Link>

          {/* Privacy */}
          <Link href="/me/privacy" className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center"><Shield size={18} className="text-violet-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Privacy</p>
              <p className="text-[11px] text-[var(--muted-strong)]">Control who sees you</p>
            </div>
            <span className="text-[var(--muted-strong)] text-xs">›</span>
          </Link>
        </div>
      </div>

      {/* ═══ SUPPORT SECTION ═══ */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted-strong)] px-1 mb-2">SUPPORT</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          {/* Feedback */}
          <Link href="/me/feedback" className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center"><MessageSquare size={18} className="text-pink-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Feedback</p>
              <p className="text-[11px] text-[var(--muted-strong)]">Help us improve MitrrAi</p>
            </div>
            <span className="text-[var(--muted-strong)] text-xs">›</span>
          </Link>

          <div className="h-px bg-[var(--border)]" />

          {/* Help & FAQ */}
          <Link href="/me/help" className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center"><HelpCircle size={18} className="text-sky-400" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-[var(--foreground)]">Help & FAQ</p>
              <p className="text-[11px] text-[var(--muted-strong)]">How to use MitrrAi</p>
            </div>
            <span className="text-[var(--muted-strong)] text-xs">›</span>
          </Link>
        </div>
      </div>

      {/* ═══ SIGN OUT ═══ */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6">
          <div className="w-full max-w-sm rounded-3xl p-6 text-center space-y-4 animate-appear"
            style={{ background: 'var(--surface-solid)', border: '1px solid var(--glass-border)' }}>
            <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Sign out of MitrAI?
            </h2>
            <p className="text-sm text-[var(--muted-strong)] leading-relaxed">
              {logoutMessage}
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all"
                style={{ background: 'var(--surface-light)', color: 'var(--foreground)' }}
              >
                {stayButton}
              </button>
              <button
                onClick={() => { setShowLogoutModal(false); logout(); }}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm text-red-400 transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {user && (
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-3.5 rounded-2xl text-center text-sm font-semibold text-red-400 hover:bg-red-500/5 transition-colors btn-ripple"
          style={{ background: 'var(--surface)', border: '1px solid var(--error, rgba(239,68,68,0.15))' }}
        >
          Sign Out
        </button>
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="flex items-center justify-center gap-3 text-[11px] text-[var(--muted-strong)] pb-6">
        <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">Terms</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">Privacy</Link>
        <span>·</span>
        <span>MitrrAi v1.0</span>
      </div>

    </div>
  );
}
