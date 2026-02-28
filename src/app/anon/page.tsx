// ============================================
// MitrAI - Anonymous Chat Lobby
// Room type selection, queue, coupon gate
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ROOM_TYPES, ANON_PRICING } from '@/lib/anon-aliases';

type Status = 'loading' | 'no-pass' | 'banned' | 'idle' | 'queuing' | 'matched';

export default function AnonLobbyPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<Status>('loading');
  const [banInfo, setBanInfo] = useState<{ reason?: string; expiresAt?: string }>({});
  const [passInfo, setPassInfo] = useState<{ plan?: string; expiresAt?: string }>({});
  const [selectedType, setSelectedType] = useState<string>('vent');
  const [alias, setAlias] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [queueSeconds, setQueueSeconds] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check status on mount
  useEffect(() => {
    if (!user) return;
    checkStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/anon?check=status');
      const data = await res.json();
      if (!data.success) { setStatus('idle'); return; }

      const d = data.data;
      if (d.banned) {
        setStatus('banned');
        setBanInfo({ reason: d.banReason, expiresAt: d.banExpiresAt });
        return;
      }
      if (d.activeRoomId) {
        router.push(`/anon/${d.activeRoomId}`);
        return;
      }
      if (!d.hasPass) {
        setStatus('no-pass');
        if (d.pass) setPassInfo({ plan: d.pass.plan, expiresAt: d.pass.expiresAt });
        return;
      }
      setPassInfo({ plan: d.pass?.plan, expiresAt: d.pass?.expiresAt });
      setStatus('idle');
    } catch {
      setStatus('idle');
    }
  };

  const handleJoinQueue = async () => {
    setStatus('queuing');
    setQueueSeconds(0);
    try {
      const res = await fetch('/api/anon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomType: selectedType }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.error === 'NO_PASS') { setStatus('no-pass'); return; }
        if (data.error === 'BANNED') { setStatus('banned'); setBanInfo({ reason: data.reason, expiresAt: data.expiresAt }); return; }
        setStatus('idle');
        return;
      }
      setAlias(data.data.alias);
      startPolling();
    } catch {
      setStatus('idle');
    }
  };

  const startPolling = useCallback(() => {
    // Timer for queue duration display
    timerRef.current = setInterval(() => setQueueSeconds(s => s + 1), 1000);

    // Poll every 3s for match
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/anon?check=poll');
        const data = await res.json();
        if (data.success && data.data.matched) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus('matched');
          setTimeout(() => router.push(`/anon/${data.data.roomId}`), 800);
        }
      } catch { /* keep polling */ }
    }, 3000);
  }, [router]);

  const handleLeaveQueue = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    await fetch('/api/anon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave' }),
    });
    setStatus('idle');
    setAlias('');
    setQueueSeconds(0);
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/api/anon/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setCouponError(data.error || 'Failed to redeem');
      } else {
        setCouponCode('');
        setCouponError('');
        setStatus('idle');
        setPassInfo({ plan: data.data.pass.plan, expiresAt: data.data.pass.expiresAt });
      }
    } catch {
      setCouponError('Network error');
    } finally {
      setCouponLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--muted)]">Please log in to access Anonymous Chat</p>
      </div>
    );
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            🎭 Anonymous Chat
          </h1>
          <p className="text-[var(--muted)] text-sm">
            Talk freely with another SVNITian. No names, no judgments.
          </p>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--muted)] text-sm">Checking your access...</p>
          </div>
        )}

        {/* Banned */}
        {status === 'banned' && (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🚫</div>
            <h2 className="text-xl font-bold text-[var(--error)] mb-2">You&apos;re Temporarily Banned</h2>
            <p className="text-[var(--muted)] text-sm mb-2">{banInfo.reason || 'Multiple reports received'}</p>
            {banInfo.expiresAt && (
              <p className="text-sm text-[var(--muted)]">
                Expires: {new Date(banInfo.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
              </p>
            )}
            {!banInfo.expiresAt && <p className="text-sm text-[var(--error)]">This ban is permanent.</p>}
          </div>
        )}

        {/* No Pass — Coupon Gate */}
        {status === 'no-pass' && (
          <div className="space-y-6">
            {/* Teaser */}
            <div className="card p-8 text-center border-2 border-dashed border-[var(--primary)]/30">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Unlock Anonymous Chat</h2>
              <p className="text-[var(--muted)] text-sm mb-6">
                Chat anonymously with fellow SVNITians. Vent, confess, get advice — all without revealing your identity.
              </p>

              {/* Pricing tiers */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {ANON_PRICING.map(tier => (
                  <div key={tier.plan} className={`p-4 rounded-xl border-2 transition-all ${
                    tier.plan === 'monthly' 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5 scale-105' 
                      : 'border-[var(--border)]'
                  }`}>
                    {tier.plan === 'monthly' && (
                      <div className="text-[10px] font-bold text-[var(--primary)] mb-1">POPULAR</div>
                    )}
                    <div className="text-sm font-semibold text-[var(--foreground)]">{tier.label}</div>
                    <div className="text-xl font-bold text-[var(--primary)] mt-1">₹{tier.price}</div>
                    <div className="text-[10px] text-[var(--muted)]">{tier.durationDays} days</div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-2 text-left text-xs text-[var(--muted)] mb-6">
                <div className="flex items-center gap-2">✅ Random matching</div>
                <div className="flex items-center gap-2">✅ 5 room types</div>
                <div className="flex items-center gap-2">✅ Fun aliases</div>
                <div className="flex items-center gap-2">✅ Mutual reveal option</div>
                <div className="flex items-center gap-2">✅ Report & block</div>
                <div className="flex items-center gap-2">✅ SVNIT-only safe space</div>
              </div>

              {/* Coupon input */}
              <div className="flex gap-2 max-w-sm mx-auto">
                <input
                  type="text"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted)]"
                  maxLength={30}
                />
                <button
                  onClick={handleRedeemCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
                >
                  {couponLoading ? '...' : 'Redeem'}
                </button>
              </div>
              {couponError && <p className="text-[var(--error)] text-xs mt-2">{couponError}</p>}
              <p className="text-[10px] text-[var(--muted)] mt-3">
                Get coupon codes from campus events, club activities, or friends! 🎉
              </p>
            </div>
          </div>
        )}

        {/* Idle — Room Selection */}
        {status === 'idle' && (
          <div className="space-y-6">
            {/* Pass info */}
            {passInfo.plan && (
              <div className="card p-3 flex items-center justify-between">
                <span className="text-xs text-[var(--muted)]">
                  ✅ {passInfo.plan.charAt(0).toUpperCase() + passInfo.plan.slice(1)} Pass Active
                </span>
                <span className="text-xs text-[var(--muted)]">
                  Expires: {passInfo.expiresAt ? new Date(passInfo.expiresAt).toLocaleDateString('en-IN') : '—'}
                </span>
              </div>
            )}

            {/* Room Types */}
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Choose a vibe</h2>
              <div className="grid gap-3">
                {ROOM_TYPES.map(rt => (
                  <button
                    key={rt.id}
                    onClick={() => setSelectedType(rt.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedType === rt.id
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 shadow-lg'
                        : 'border-[var(--border)] hover:border-[var(--primary)]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{rt.emoji}</span>
                      <div>
                        <div className="font-semibold text-[var(--foreground)] text-sm">{rt.label}</div>
                        <div className="text-xs text-[var(--muted)]">{rt.description}</div>
                      </div>
                      {selectedType === rt.id && (
                        <span className="ml-auto text-[var(--primary)] text-lg">●</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Night Owl warning */}
            {selectedType === 'night_owl' && (
              <div className="card p-3 bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs text-purple-400">
                  🦉 Night Owl Chat is best between 11 PM – 4 AM. You can still queue anytime!
                </p>
              </div>
            )}

            {/* Join button */}
            <button
              onClick={handleJoinQueue}
              className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              🎲 Find a Random Match
            </button>

            {/* Safety notice */}
            <p className="text-center text-[10px] text-[var(--muted)]">
              Be respectful. Reports lead to temporary/permanent bans. Your SVNIT email is on file.
            </p>
          </div>
        )}

        {/* Queuing */}
        {status === 'queuing' && (
          <div className="card p-8 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)]/20" />
              <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
              <span className="absolute inset-0 flex items-center justify-center text-2xl">🔍</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Finding your match...</h2>
            <p className="text-[var(--muted)] text-sm mb-1">
              You are <span className="font-mono text-[var(--primary)]">{alias}</span>
            </p>
            <p className="text-[var(--muted)] text-xs mb-4">
              Room: {ROOM_TYPES.find(r => r.id === selectedType)?.label} {ROOM_TYPES.find(r => r.id === selectedType)?.emoji}
            </p>
            <div className="text-3xl font-mono text-[var(--foreground)] mb-6">{formatTime(queueSeconds)}</div>
            <button
              onClick={handleLeaveQueue}
              className="text-sm text-[var(--muted)] hover:text-[var(--error)] transition-colors"
            >
              Cancel & Leave Queue
            </button>
          </div>
        )}

        {/* Matched */}
        {status === 'matched' && (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-xl font-bold text-[var(--primary)] mb-2">Match Found!</h2>
            <p className="text-[var(--muted)] text-sm">Entering chat room...</p>
          </div>
        )}
      </div>
    </div>
  );
}
