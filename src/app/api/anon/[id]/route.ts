// ============================================
// MitrAI - Anonymous Chat Room API
// GET /api/anon/[id]: room details + messages
// POST /api/anon/[id]: send message, report, reveal, close
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import {
  getAnonRoom,
  getAnonMessages,
  sendAnonMessage,
  toggleRevealConsent,
  closeAnonRoom,
  reportAnonUser,
  blockAnonUser,
} from '@/lib/store/anon';

export const dynamic = 'force-dynamic';

// GET /api/anon/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const roomId = params.id;
  const userId = authUser.id;

  try {
    const roomData = await getAnonRoom(roomId);
    if (!roomData) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });

    // Verify user is a member
    const isMember = roomData.members.some(m => m.userId === userId);
    if (!isMember) return forbidden();

    const messages = await getAnonMessages(roomId);
    const me = roomData.members.find(m => m.userId === userId)!;
    const partner = roomData.members.find(m => m.userId !== userId);

    // If revealed, fetch real identities
    let partnerRealInfo: { name?: string; department?: string } | null = null;
    if (roomData.room.status === 'revealed' && partner) {
      // Import dynamically to avoid circular deps
      const { getStudentById } = await import('@/lib/store/students');
      const student = await getStudentById(partner.userId);
      if (student) {
        partnerRealInfo = { name: student.name, department: student.department };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        room: roomData.room,
        myAlias: me.alias,
        myRevealConsent: me.revealConsent,
        partnerAlias: partner?.alias || 'Waiting...',
        partnerRevealConsent: partner?.revealConsent || false,
        partnerRealInfo,
        messages,
        messageCount: messages.length,
      },
    });
  } catch (error) {
    console.error('Anon room GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// POST /api/anon/[id] { action: 'message' | 'reveal' | 'close' | 'report' | 'block' }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const roomId = params.id;
  const userId = authUser.id;

  try {
    const body = await req.json();
    const { action } = body;

    // Verify membership
    const roomData = await getAnonRoom(roomId);
    if (!roomData) return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    const me = roomData.members.find(m => m.userId === userId);
    if (!me) return forbidden();
    const partner = roomData.members.find(m => m.userId !== userId);

    if (action === 'message') {
      if (roomData.room.status === 'closed') {
        return NextResponse.json({ success: false, error: 'Room is closed' }, { status: 400 });
      }
      if (!rateLimit(`anon-msg:${userId}`, 30, 60_000)) return rateLimitExceeded();

      const { text } = body;
      if (!text || text.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Message text required' }, { status: 400 });
      }
      if (text.length > 1000) {
        return NextResponse.json({ success: false, error: 'Message too long (max 1000 chars)' }, { status: 400 });
      }

      const msg = await sendAnonMessage(roomId, userId, me.alias, text.trim());
      return NextResponse.json({ success: true, data: msg });
    }

    if (action === 'reveal') {
      // Need at least 10 messages before reveal
      const messages = await getAnonMessages(roomId);
      if (messages.length < 10) {
        return NextResponse.json({ success: false, error: 'Need at least 10 messages to reveal' }, { status: 400 });
      }

      const result = await toggleRevealConsent(roomId, userId);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'close') {
      await closeAnonRoom(roomId);
      return NextResponse.json({ success: true });
    }

    if (action === 'report') {
      const { reason, messageId } = body;
      if (!reason) return NextResponse.json({ success: false, error: 'Reason required' }, { status: 400 });
      if (!partner) return NextResponse.json({ success: false, error: 'No partner to report' }, { status: 400 });

      await reportAnonUser(roomId, userId, partner.userId, reason, messageId);
      return NextResponse.json({ success: true });
    }

    if (action === 'block') {
      if (!partner) return NextResponse.json({ success: false, error: 'No partner to block' }, { status: 400 });
      await blockAnonUser(userId, partner.userId);
      await closeAnonRoom(roomId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Anon room POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
