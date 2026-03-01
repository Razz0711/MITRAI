// ============================================
// MitrAI - Incoming Call Banner
// Global overlay that listens for call-invite events
// via Supabase Realtime Broadcast and shows Accept/Decline UI
// ============================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { playNotificationSound } from '@/hooks/useNotificationSound';

interface CallInvite {
  callerId: string;
  callerName: string;
  mode: 'voice' | 'video';
  roomCode: string;
}

const RING_TIMEOUT_MS = 30_000; // Auto-dismiss after 30 seconds
const RING_INTERVAL_MS = 2_000; // Play ringtone every 2 seconds

export default function IncomingCallBanner() {
  const { user } = useAuth();
  const [invite, setInvite] = useState<CallInvite | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null);

  // Cleanup timers
  const clearTimers = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Dismiss the banner
  const dismiss = useCallback(() => {
    clearTimers();
    setInvite(null);
  }, [clearTimers]);

  // Accept the call
  const acceptCall = useCallback(() => {
    if (!invite) return;
    clearTimers();
    const { mode, roomCode, callerName } = invite;
    setInvite(null);
    window.location.href = `/call?mode=${mode}&room=${roomCode}&buddy=${encodeURIComponent(callerName)}`;
  }, [invite, clearTimers]);

  // Decline the call
  const declineCall = useCallback(() => {
    dismiss();
  }, [dismiss]);

  // Start ringing
  const startRinging = useCallback((inv: CallInvite) => {
    // Don't ring if we're already on the call page (probably the caller)
    if (window.location.pathname === '/call') return;

    clearTimers();
    setInvite(inv);

    // Play initial ring immediately
    try { playNotificationSound('call'); } catch {}

    // Repeat ring
    ringIntervalRef.current = setInterval(() => {
      try { playNotificationSound('call'); } catch {}
    }, RING_INTERVAL_MS);

    // Auto-dismiss after timeout
    timeoutRef.current = setTimeout(() => {
      dismiss();
    }, RING_TIMEOUT_MS);
  }, [clearTimers, dismiss]);

  // Subscribe to Supabase Realtime channel for this user
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `call-invite:${user.id}`;
    const channel = supabaseBrowser.channel(channelName);

    channel
      .on('broadcast', { event: 'incoming-call' }, (payload) => {
        const data = payload.payload as CallInvite;
        if (data && data.callerId && data.roomCode) {
          startRinging(data);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      clearTimers();
      supabaseBrowser.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, startRinging, clearTimers]);

  // Nothing to show
  if (!invite) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pointer-events-none">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={declineCall} />

      {/* Banner */}
      <div className="relative mt-4 mx-4 w-full max-w-sm pointer-events-auto animate-slide-down">
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
          {/* Pulsing top accent */}
          <div className="h-1 bg-gradient-to-r from-green-500 via-green-400 to-green-500 animate-pulse" />

          <div className="p-5">
            {/* Caller info */}
            <div className="flex items-center gap-4 mb-5">
              {/* Avatar */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center text-xl font-bold text-green-400 animate-pulse">
                  {invite.callerName.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -top-1 -right-1 text-lg">
                  {invite.mode === 'video' ? '📹' : '📞'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-[var(--foreground)] truncate">
                  {invite.callerName}
                </p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Incoming {invite.mode} call…
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={declineCall}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 active:scale-95 transition-all"
              >
                ✕ Decline
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 active:scale-95 transition-all"
              >
                ✓ Accept
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-down animation */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
