// ============================================
// MitrAI - Push Subscription API
// POST: subscribe (save push subscription)
// DELETE: unsubscribe (remove push subscription)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { savePushSubscription, removePushSubscription } from '@/lib/store/push-subscriptions';

export const dynamic = 'force-dynamic';

// GET /api/push — return the VAPID public key (so client can subscribe even if build-time env was empty)
export async function GET() {
  const vapidKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').replace(/=+$/, '').trim();
  return NextResponse.json({ vapidPublicKey: vapidKey });
}

// POST /api/push — save a push subscription
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ success: false, error: 'Invalid subscription object' }, { status: 400 });
    }

    await savePushSubscription(authUser.id, subscription);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save subscription' }, { status: 500 });
  }
}

// DELETE /api/push — remove a push subscription
export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'endpoint required' }, { status: 400 });
    }

    await removePushSubscription(authUser.id, endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove subscription' }, { status: 500 });
  }
}
