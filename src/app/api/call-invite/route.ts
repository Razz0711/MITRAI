// ============================================
// MitrAI - Call Invite API
// Sends push notification to a user about an incoming call
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/store/push-subscriptions';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const { receiverId, callerName, mode, roomCode } = await request.json();

    if (!receiverId || !callerName || !mode || !roomCode) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Send push notification so the user sees it even if app is in background
    await sendPushToUser(receiverId, {
      title: `📞 Incoming ${mode} call`,
      body: `${callerName} is calling you!`,
      url: `/call?mode=${mode}&room=${roomCode}&buddy=${encodeURIComponent(callerName)}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('call-invite error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
