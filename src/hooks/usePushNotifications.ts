// ============================================
// MitrRAI - Web Push Notifications Hook
// Registers service worker, requests permission,
// subscribes to push and saves to backend.
// ============================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/** Convert a base64url VAPID public key to Uint8Array for pushManager.subscribe */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useVapidSubscription(userId: string | null | undefined) {
  const registered = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (registered.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!VAPID_PUBLIC_KEY) {
      console.warn('usePushNotifications: VAPID_PUBLIC_KEY not set');
      return;
    }

    registered.current = true;

    const setupPush = async () => {
      try {
        // 1. Register the service worker
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // 2. Check existing permission — don't re-ask if already granted/denied
        let permission = Notification.permission;
        if (permission === 'default') {
          // Small delay so the user is settled into the app before we prompt
          await new Promise(r => setTimeout(r, 3000));
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          console.log('Push notifications not granted');
          return;
        }

        // 3. Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        // 4. If not subscribed, subscribe now
        if (!subscription) {
          const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
          });
        }

        // 5. Save subscription to backend
        const subJson = subscription.toJSON();
        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subJson }),
        });

        console.log('✅ Push notifications registered for user:', userId);
      } catch (err) {
        console.error('Push registration failed:', err);
        registered.current = false; // Allow retry next render
      }
    };

    setupPush();
  }, [userId]);
}

// ============================================
// Original usePushNotifications hook
// Returns { permission, requestPermission, showNotification }
// Used by GlobalNotificationPoller for in-app notifications
// ============================================

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const showNotification = useCallback(
    (title: string, body: string, options?: { tag?: string; url?: string }) => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          tag: options?.tag || 'mitrrai-notif',
          data: { url: options?.url || '/home' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }).catch(() => {
        new Notification(title, { body, icon: '/logo.jpg' });
      });
    },
    []
  );

  return { permission, requestPermission, showNotification };
}
