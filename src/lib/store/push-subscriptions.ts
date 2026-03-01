// ============================================
// MitrAI - Push Subscription Store
// CRUD for Web Push subscriptions + send push via web-push
// ============================================

import { supabase } from './core';

// Lazy-loaded web-push (avoids crashing at build / import time)
let _webpush: typeof import('web-push') | null = null;
let _vapidConfigured = false;

async function getWebPush() {
  if (!_webpush) {
    _webpush = (await import('web-push')).default as unknown as typeof import('web-push');
  }
  if (!_vapidConfigured) {
    const pubKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').replace(/=+$/, '').trim();
    const privKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
    const subject = process.env.VAPID_SUBJECT || 'mailto:mitrai@svnit.ac.in';
    if (pubKey && privKey) {
      _webpush.setVapidDetails(subject, pubKey, privKey);
      _vapidConfigured = true;
    }
  }
  return _webpush;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

/** Save or update a push subscription for a user */
export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  const id = `push_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      id,
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' },
  );
  if (error) console.error('savePushSubscription error:', error);
}

/** Remove a push subscription */
export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);
  if (error) console.error('removePushSubscription error:', error);
}

/** Get all push subscriptions for a user */
export async function getUserPushSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);
  if (error) { console.error('getUserPushSubscriptions error:', error); return []; }
  return (data || []) as unknown as PushSubscriptionRecord[];
}

/** Get all push subscriptions (for broadcast) */
export async function getAllPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');
  if (error) { console.error('getAllPushSubscriptions error:', error); return []; }
  return (data || []) as unknown as PushSubscriptionRecord[];
}

/** Send a web push notification to a specific subscription */
export async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
): Promise<boolean> {
  const pubKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();
  const privKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  if (!pubKey || !privKey) return false;

  const wp = await getWebPush();
  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    await wp.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    // 410 Gone or 404 = subscription expired, clean it up
    if (statusCode === 410 || statusCode === 404) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
    return false;
  }
}

/** Send web push to ALL subscriptions of a user */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  const subs = await getUserPushSubscriptions(userId);
  await Promise.allSettled(subs.map(s => sendWebPush(s, payload)));
}

/** Broadcast web push to all subscribed users (optionally exclude one) */
export async function broadcastWebPush(
  payload: { title: string; body: string; url?: string },
  excludeUserId?: string,
): Promise<void> {
  const allSubs = await getAllPushSubscriptions();
  const targets = excludeUserId
    ? allSubs.filter(s => {
        const uid = (s as unknown as Record<string, string>).user_id || s.userId;
        return uid !== excludeUserId;
      })
    : allSubs;
  // Send in parallel batches of 50
  for (let i = 0; i < targets.length; i += 50) {
    const batch = targets.slice(i, i + 50);
    await Promise.allSettled(batch.map(s => sendWebPush(s, payload)));
  }
}
