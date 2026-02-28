// ============================================
// MitrAI - Doubt Replies API
// GET: get replies for a doubt
// POST: add a reply
// PATCH: accept a reply
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getDoubtReplies,
  addDoubtReply,
  acceptReply,
  awardXP,
  awardBadge,
} from '@/lib/store';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/doubts/[id]/replies
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const replies = await getDoubtReplies(params.id);
  return NextResponse.json({ success: true, data: { replies } });
}

// POST /api/doubts/[id]/replies — add a reply
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`doubt-reply:${authUser.id}`, 20, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { userId, userName, reply, isAnonymous } = body;

    if (!userId || !reply) {
      return NextResponse.json({ success: false, error: 'userId and reply required' }, { status: 400 });
    }

    const ok = await addDoubtReply({
      doubtId: params.id,
      userId,
      userName: userName || 'Student',
      reply,
      isAnonymous: isAnonymous || false,
    });

    if (!ok) {
      return NextResponse.json({ success: false, error: 'Could not add reply' }, { status: 500 });
    }

    // Award XP for helping
    await awardXP(userId, 10, 'Answered a doubt');
    await awardBadge(userId, 'helper');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

// PATCH /api/doubts/[id]/replies — accept a reply
export async function PATCH(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await req.json();
    const { replyId } = body;

    if (!replyId) {
      return NextResponse.json({ success: false, error: 'replyId required' }, { status: 400 });
    }

    const ok = await acceptReply(replyId);
    if (!ok) return NextResponse.json({ success: false, error: 'Could not accept reply' }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
