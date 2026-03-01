// ============================================
// MitrAI - Doubts API
// GET: list doubts
// POST: create a doubt
// PATCH: upvote / close doubt
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getDoubts,
  createDoubt,
  upvoteDoubt,
  closeDoubt,
  awardXP,
  cleanupExpiredDoubts,
} from '@/lib/store';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/doubts?department=xxx&status=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const department = req.nextUrl.searchParams.get('department') || undefined;
  const status = req.nextUrl.searchParams.get('status') || undefined;

  // Auto-cleanup doubts older than 24 hours
  await cleanupExpiredDoubts();

  const doubts = await getDoubts({ department, status });
  return NextResponse.json({ success: true, data: { doubts } });
}

// POST /api/doubts — create a doubt
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`doubts:${authUser.id}`, 10, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { userId, department, subject, question, isAnonymous } = body;

    if (!userId || !question) {
      return NextResponse.json({ success: false, error: 'userId and question required' }, { status: 400 });
    }

    const doubt = await createDoubt({
      id: `doubt_${uuidv4().slice(0, 8)}`,
      userId,
      department: department || '',
      subject: subject || '',
      question,
      isAnonymous: isAnonymous !== false,
    });

    if (!doubt) {
      return NextResponse.json({ success: false, error: 'Could not create doubt' }, { status: 500 });
    }

    await awardXP(userId, 5, 'Posted a doubt');
    return NextResponse.json({ success: true, data: { doubt } });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

// PATCH /api/doubts  { action: 'upvote' | 'close', doubtId, userId }
export async function PATCH(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await req.json();
    const { action, doubtId, userId } = body;

    if (action === 'upvote') {
      const ok = await upvoteDoubt(doubtId);
      if (!ok) return NextResponse.json({ success: false, error: 'Could not upvote' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'close') {
      const ok = await closeDoubt(doubtId, userId);
      if (!ok) return NextResponse.json({ success: false, error: 'Could not close doubt' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
