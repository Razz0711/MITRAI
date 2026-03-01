// ============================================
// MitrAI - Service Worker for Push Notifications
// ============================================

const CACHE_NAME = 'mitrai-v1';

// Install — activate immediately
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Handle notification click — focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If the app is already open, focus it
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (url !== '/dashboard') client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});

// Handle push events (for future server-sent push)
self.addEventListener('push', (event) => {
  let data = { title: 'MitrAI', body: 'You have a new notification', url: '/dashboard' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  // Detect call notifications for special handling
  const isCall = data.title && data.title.includes('call');

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      vibrate: isCall
        ? [300, 150, 300, 150, 300, 150, 300]   // long ringtone vibration
        : [200, 100, 200],
      tag: isCall ? 'mitrai-call-' + Date.now() : 'mitrai-notification',
      renotify: true,
      requireInteraction: isCall,  // keep call notifications visible until dismissed
      silent: false,               // ensure system plays notification sound
      data: { url: data.url },
    })
  );
});
