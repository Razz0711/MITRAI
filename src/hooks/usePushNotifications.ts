// ============================================
// MitrAI - Web Push Notification Hook (REAL Push API)
// Uses PushManager.subscribe() with VAPID for
// server-sent notifications that work even when
// the browser/tab is CLOSED.
// ============================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

// VAPID public key from env (available at build time via NEXT_PUBLIC_ prefix)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/** Convert URL-safe base64 VAPID key → Uint8Array for PushManager */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'none' | 'subscribing' | 'subscribed' | 'error'>('none');
  const swReg = useRef<ServiceWorkerRegistration | null>(null);
  const subscribed = useRef(false);

  /** Subscribe to Web Push via PushManager and send subscription to our server */
  const subscribeToPush = useCallback(async (reg: ServiceWorkerRegistration) => {
    if (subscribed.current) return;
    if (!VAPID_PUBLIC_KEY) {
      console.error('[Push] VAPID_PUBLIC_KEY is empty — env var NEXT_PUBLIC_VAPID_PUBLIC_KEY not set at build time');
      setSubscriptionStatus('error');
      return;
    }
    setSubscriptionStatus('subscribing');
    try {
      let sub = await reg.pushManager.getSubscription();
      console.log('[Push] Existing subscription:', sub ? 'yes' : 'no');

      if (!sub) {
        console.log('[Push] Creating new PushManager subscription...');
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });
        console.log('[Push] PushManager subscription created:', sub.endpoint.slice(0, 60) + '...');
      }

      // Send subscription to our server to store in DB
      const subJson = sub.toJSON();
      console.log('[Push] Sending subscription to /api/push...');
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: sub.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh || '',
              auth: subJson.keys?.auth || '',
            },
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        console.log('[Push] Subscription saved to server successfully!');
        subscribed.current = true;
        setSubscriptionStatus('subscribed');
      } else {
        console.error('[Push] Server rejected subscription:', data.error);
        setSubscriptionStatus('error');
      }
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      setSubscriptionStatus('error');
    }
  }, []);

  // Register service worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('[Push] Notifications or ServiceWorker not supported');
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PermissionState);
    console.log('[Push] Current permission:', Notification.permission, '| VAPID key length:', VAPID_PUBLIC_KEY.length);

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[Push] Service worker registered, scope:', reg.scope);
        swReg.current = reg;
        // If already granted, auto-subscribe to push
        if (Notification.permission === 'granted') {
          subscribeToPush(reg);
        }
      })
      .catch((err) => console.error('[Push] SW registration failed:', err));
  }, [subscribeToPush]);

  /** Request notification permission, then subscribe to push */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      setPermission('granted');
      if (swReg.current) subscribeToPush(swReg.current);
      return true;
    }
    if (Notification.permission === 'denied') {
      setPermission('denied');
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result === 'granted' && swReg.current) {
        await subscribeToPush(swReg.current);
      }
      return result === 'granted';
    } catch {
      return false;
    }
  }, [subscribeToPush]);

  /** Fallback: show a local notification (for when tab IS active) */
  const showNotification = useCallback(
    (title: string, body: string, options?: { url?: string; tag?: string }) => {
      if (permission !== 'granted') return;
      const tag = options?.tag || `mitrai-${Date.now()}`;
      const notifOptions = {
        body,
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        vibrate: [200, 100, 200],
        tag,
        renotify: true,
        data: { url: options?.url || '/dashboard' },
      } as NotificationOptions;

      if (swReg.current) {
        swReg.current.showNotification(title, notifOptions).catch(() => {
          try { new Notification(title, notifOptions); } catch { /* noop */ }
        });
      } else {
        try { new Notification(title, notifOptions); } catch { /* noop */ }
      }
    },
    [permission],
  );

  return {
    permission,
    subscriptionStatus,
    requestPermission,
    showNotification,
    isSupported: permission !== 'unsupported',
  };
}
