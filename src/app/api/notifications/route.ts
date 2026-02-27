// ============================================
// MitrAI - Notifications API
// GET: get notifications for a user
// POST: mark notification as read OR create notification
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, markNotificationRead, addNotification } from '@/lib/store';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

// GET /api/notifications?userId=xxx
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const notifs = await getNotifications(userId);
    // Sort newest first
    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, data: notifs });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications — mark as read OR create notification
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await request.json();
    const { action } = body;

    // Create a new notification
    if (action === 'create') {
      const { userId, type, title, message } = body;
      if (!userId || !title) {
        return NextResponse.json({ success: false, error: 'Missing userId or title' }, { status: 400 });
      }
      await addNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        type: type || 'match_found',
        title,
        message: message || '',
        read: false,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    // Default: mark as read
    const { userId, notificationId } = body;
    if (!userId || !notificationId) {
      return NextResponse.json({ success: false, error: 'Missing userId or notificationId' }, { status: 400 });
    }

    await markNotificationRead(userId, notificationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 });
  }
}
