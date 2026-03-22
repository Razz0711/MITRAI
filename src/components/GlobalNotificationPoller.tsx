// ============================================
// MitrRAI - Global Notification Manager
// Runs on every authenticated page inside AppShell.
//
// TWO notification channels:
// 1. REAL Web Push (server → push service → phone)
//    Works even when browser is FULLY CLOSED.
//    Handled by usePushNotifications hook + service worker.
//
// 2. Supabase Realtime (for in-app badge updates)
//    Subscribes to INSERT events on the notifications table.
//    Zero polling — instant delivery when tab is open.
// ============================================

'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Notification as NotifType } from '@/lib/types';

export default function GlobalNotificationPoller() {
  const { user } = useAuth();
  const { permission, requestPermission, showNotification } = usePushNotifications();
  const seenIds = useRef<Set<string>>(new Set());
  const initialised = useRef(false);

  // Request push permission after a short delay on first render
  useEffect(() => {
    if (!user || permission !== 'default') return;
    const t = setTimeout(() => requestPermission(), 3000);
    return () => clearTimeout(t);
  }, [user, permission, requestPermission]);

  // Seed known IDs on mount so we don't replay existing notifications
  useEffect(() => {
    if (!user || initialised.current) return;
    fetch(`/api/notifications?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const notifs: NotifType[] = data.data || [];
          seenIds.current = new Set(notifs.map(n => n.id));
        }
        initialised.current = true;
      })
      .catch(() => { initialised.current = true; });
  }, [user]);

  // Subscribe to Realtime INSERT events on the notifications table
  useEffect(() => {
    if (!user) return;

    const channel = supabaseBrowser
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as NotifType;
          if (!notif?.id || seenIds.current.has(notif.id)) return;
          seenIds.current.add(notif.id);

          if (!initialised.current) return; // still seeding — skip

          if (permission === 'granted' && !notif.read) {
            const cleanMessage = notif.message?.replace(/\s*\{\{room:[^}]+\}\}/g, '') ?? '';
            showNotification(notif.title, cleanMessage, {
              tag: `notif-${notif.id}`,
              url: getUrlForNotif(notif),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [user, permission, showNotification]);

  // No UI — this is a background process
  return null;
}

/** Map notification type → deeplink URL */
function getUrlForNotif(n: NotifType): string {
  const t = n.type;
  if (t === 'anon_waiting') return '/anon';
  if (t === 'match_found') return '/matches';
  if (t === 'friend_request' || t === 'friend_accepted') return '/friends';
  if (t === 'room_join' || t === 'room_message') return '/rooms';
  if (t === 'doubt_posted') return '/doubts';
  if (t === 'material_uploaded') return '/materials';
  if (t === 'birthday_wish') return '/home';
  if (t === 'radar_connect') {
    const roomMatch = n.message?.match(/\{\{room:([^}]+)\}\}/);
    if (roomMatch) return `/anon/${roomMatch[1]}`;
    if (n.message?.includes('anonymous')) return '/anon';
    return '/chat';
  }
  if (t === 'session_request' || t === 'session_accepted' || t === 'session_declined') return '/session';
  return '/home';
}
