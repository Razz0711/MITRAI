// ============================================
// MitrAI - Online Status Heartbeat Hook
// Automatically sends heartbeat every 30s
// Sets user as online when app is open
// Sets user as offline on tab close / inactivity
// ============================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

export function useStatusHeartbeat() {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const sendHeartbeat = useCallback(async (status: 'online' | 'offline' = 'online') => {
    if (!user) return;

    // Check inactivity (5 min)
    const inactive = Date.now() - lastActivityRef.current > 5 * 60 * 1000;

    try {
      await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          status: inactive ? 'offline' : status,
        }),
      });
    } catch (err) {
      // Status heartbeat failed silently
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Track user activity
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);
    window.addEventListener('scroll', onActivity);
    window.addEventListener('touchstart', onActivity);

    // Initial heartbeat — mark as online
    sendHeartbeat('online');

    // Send heartbeat every 30 seconds
    intervalRef.current = setInterval(() => {
      sendHeartbeat('online');
    }, 30000);

    // On tab close/navigate away — mark offline
    const onBeforeUnload = () => {
      if (user) {
        // Use sendBeacon for reliability on page unload
        navigator.sendBeacon(
          '/api/status',
          JSON.stringify({ userId: user.id, status: 'offline' })
        );
      }
    };

    // On visibility change (tab hidden)
    const onVisibilityChange = () => {
      if (document.hidden) {
        sendHeartbeat('offline');
      } else {
        lastActivityRef.current = Date.now();
        sendHeartbeat('online');
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Mark offline on cleanup
      sendHeartbeat('offline');
    };
  }, [user, sendHeartbeat]);
}
