// ============================================
// MitrAI - Notifications API
// GET: get notifications for a user
// POST: mark notification as read
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, markNotificationRead } from '@/lib/store';

// GET /api/notifications?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const notifs = getNotifications(userId);
    // Sort newest first
    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, data: notifs });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notifications — mark as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notificationId } = body;

    if (!userId || !notificationId) {
      return NextResponse.json({ success: false, error: 'Missing userId or notificationId' }, { status: 400 });
    }

    markNotificationRead(userId, notificationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 });
  }
}
