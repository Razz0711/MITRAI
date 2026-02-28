// ============================================
// MitrAI - Single Room API
// GET: room detail + members + messages
// POST: join, leave, send message, archive
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getRoomById,
  getRoomMembers,
  getRoomMessages,
  joinRoom,
  leaveRoom,
  sendRoomMessage,
  archiveRoom,
  awardXP,
} from '@/lib/store';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/rooms/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const room = await getRoomById(params.id);
  if (!room) {
    return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
  }

  const [members, messages] = await Promise.all([
    getRoomMembers(params.id),
    getRoomMessages(params.id, 100),
  ]);

  return NextResponse.json({
    success: true,
    data: { room, members, messages },
  });
}

// POST /api/rooms/[id] { action: 'join' | 'leave' | 'send_message' | 'archive' }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`room:${authUser.id}`, 60, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { action, userId, userName, text } = body;

    if (action === 'join') {
      if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
      const ok = await joinRoom(params.id, userId, userName || 'Student');
      if (!ok) return NextResponse.json({ success: false, error: 'Could not join room' }, { status: 500 });
      await awardXP(userId, 5, 'Joined a study room');
      return NextResponse.json({ success: true });
    }

    if (action === 'leave') {
      if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
      const ok = await leaveRoom(params.id, userId);
      if (!ok) return NextResponse.json({ success: false, error: 'Could not leave room' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'send_message') {
      if (!userId || !text) return NextResponse.json({ success: false, error: 'userId and text required' }, { status: 400 });
      const ok = await sendRoomMessage({ roomId: params.id, senderId: userId, senderName: userName || 'Student', text, createdAt: new Date().toISOString() });
      if (!ok) return NextResponse.json({ success: false, error: 'Could not send message' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'archive') {
      if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
      const ok = await archiveRoom(params.id);
      if (!ok) return NextResponse.json({ success: false, error: 'Could not archive room' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
