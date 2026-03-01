// ============================================
// MitrAI - Web Push Notification Hook
// Registers service worker, requests permission,
// and exposes showNotification() for native pop-ups.
// ============================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>('default');
  const swReg = useRef<ServiceWorkerRegistration | null>(null);
  const ready = useRef(false);

  // Register service worker + check permission
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PermissionState);

    // Register SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          swReg.current = reg;
          ready.current = true;
        })
        .catch((err) => console.warn('SW registration failed:', err));
    }
  }, []);

  // Request permission (call early, e.g. on first user interaction)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }
    if (Notification.permission === 'denied') {
      setPermission('denied');
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      return result === 'granted';
    } catch {
      return false;
    }
  }, []);

  // Show a native notification pop-up
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
        silent: false,
      } as NotificationOptions;

      // Prefer service worker (works on mobile / when tab backgrounded)
      if (swReg.current) {
        swReg.current.showNotification(title, notifOptions).catch(() => {
          // Fallback to Notification constructor (desktop)
          try { new Notification(title, notifOptions); } catch { /* noop */ }
        });
      } else {
        try { new Notification(title, notifOptions); } catch { /* noop */ }
      }
    },
    [permission],
  );

  return { permission, requestPermission, showNotification, isSupported: permission !== 'unsupported' };
}
