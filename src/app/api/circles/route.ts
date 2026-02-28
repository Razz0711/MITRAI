// ============================================
// MitrAI - Circles API
// GET: list all circles + user memberships
// POST: join/leave a circle
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllCircles,
  getUserCircles,
  joinCircle,
  leaveCircle,
  getCircleMembers,
  getAllCircleMemberCounts,
  awardXP,
} from '@/lib/store';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/circles?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  const userId = req.nextUrl.searchParams.get('userId') || authUser.id;

  const [allCircles, userCircles, memberCounts] = await Promise.all([
    getAllCircles(),
    getUserCircles(userId),
    getAllCircleMemberCounts(),
  ]);

  return NextResponse.json({
    success: true,
    data: { circles: allCircles, memberships: userCircles, memberCounts },
  });
}

// POST /api/circles { action: 'join' | 'leave', circleId, userId }
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`circles:${authUser.id}`, 20, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { action, circleId, userId } = body;

    if (!circleId || !userId) {
      return NextResponse.json({ success: false, error: 'circleId and userId required' }, { status: 400 });
    }

    if (action === 'join') {
      const ok = await joinCircle(userId, circleId);
      if (!ok) return NextResponse.json({ success: false, error: 'Could not join circle' }, { status: 500 });
      // Award XP for joining a circle
      await awardXP(userId, 10, 'Joined a circle');
      return NextResponse.json({ success: true });
    }

    if (action === 'leave') {
      const ok = await leaveCircle(userId, circleId);
      if (!ok) return NextResponse.json({ success: false, error: 'Could not leave circle' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'members') {
      const members = await getCircleMembers(circleId);
      return NextResponse.json({ success: true, data: { members } });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
