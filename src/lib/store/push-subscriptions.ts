// ============================================
// MitrAI - Push Subscription Store
// CRUD for Web Push subscriptions + send push via web-push
// ============================================

import { supabase } from './core';
import webpush from 'web-push';

// Lazy VAPID configure (avoids crashing at build / import time)
let _vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (_vapidConfigured) return true;
  const pubKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').replace(/=+$/, '').trim();
  const privKey = (process.env.VAPID_PRIVATE_KEY || '').replace(/=+$/, '').trim();
  const subject = process.env.VAPID_SUBJECT || 'mailto:mitrai@svnit.ac.in';
  if (pubKey && privKey) {
    try {
      webpush.setVapidDetails(subject, pubKey, privKey);
      _vapidConfigured = true;
      return true;
    } catch (err) {
      console.error('VAPID config error:', err);
      return false;
    }
  }
  console.warn('VAPID keys not available — pubKey:', !!pubKey, 'privKey:', !!privKey);
  return false;
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
  else console.log('Push subscription saved for user:', userId);
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
  if (!ensureVapidConfigured()) {
    console.error('sendWebPush: VAPID not configured, skipping');
    return false;
  }

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    // Use high urgency + short TTL for call notifications, normal for others
    const isCall = payload.title?.includes('call');
    const options = isCall
      ? { TTL: 60, urgency: 'high' as const }
      : { TTL: 3600 };
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload), options);
    console.log('Web push sent successfully to:', sub.endpoint.slice(0, 60) + '...');
    return true;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    console.error('sendWebPush failed:', statusCode, (err as Error)?.message);
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
  console.log(`sendPushToUser: ${subs.length} subscription(s) for user ${userId}`);
  await Promise.allSettled(subs.map(s => sendWebPush(s, payload)));
}

/** Send web push to a list of user IDs (e.g. department mates) */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!userIds.length) return;
  // Fetch all subscriptions for these users in one query
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds);
  if (error) { console.error('sendPushToUsers error:', error); return; }
  const subs = (data || []) as unknown as PushSubscriptionRecord[];
  console.log(`sendPushToUsers: ${subs.length} subscription(s) for ${userIds.length} user(s)`);
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < subs.length; i += 50) {
    const batch = subs.slice(i, i + 50);
    const results = await Promise.allSettled(batch.map(s => sendWebPush(s, payload)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) sent++;
      else failed++;
    }
  }
  console.log(`sendPushToUsers: done — ${sent} sent, ${failed} failed`);
}

/** Broadcast web push to all subscribed users (optionally exclude one) */
export async function broadcastWebPush(
  payload: { title: string; body: string; url?: string },
  excludeUserId?: string,
): Promise<void> {
  const allSubs = await getAllPushSubscriptions();
  console.log(`broadcastWebPush: ${allSubs.length} total subscription(s) in DB`);
  const targets = excludeUserId
    ? allSubs.filter(s => {
        const uid = (s as unknown as Record<string, string>).user_id || s.userId;
        return uid !== excludeUserId;
      })
    : allSubs;
  console.log(`broadcastWebPush: sending to ${targets.length} target(s) (excluded: ${excludeUserId || 'none'})`);
  // Send in parallel batches of 50
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < targets.length; i += 50) {
    const batch = targets.slice(i, i + 50);
    const results = await Promise.allSettled(batch.map(s => sendWebPush(s, payload)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) sent++;
      else failed++;
    }
  }
  console.log(`broadcastWebPush: done — ${sent} sent, ${failed} failed`);
}
