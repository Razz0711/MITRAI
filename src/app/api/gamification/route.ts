// ============================================
// MitrAI - Gamification API
// GET: user XP, badges, leaderboard
// POST: award XP / badge
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserXP,
  getUserBadges,
  getLeaderboard,
  awardXP,
  awardBadge,
  BADGE_DEFS,
} from '@/lib/store';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/gamification?userId=xxx&view=leaderboard
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = req.nextUrl.searchParams.get('userId') || authUser.id;
  const view = req.nextUrl.searchParams.get('view');

  if (view === 'leaderboard') {
    const leaderboard = await getLeaderboard(20);
    return NextResponse.json({ success: true, data: { leaderboard } });
  }

  const [xp, badges] = await Promise.all([
    getUserXP(userId),
    getUserBadges(userId),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      xp,
      badges,
      badgeDefs: BADGE_DEFS,
    },
  });
}

// POST /api/gamification { action: 'award_xp' | 'award_badge', userId, ... }
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`gamification:${authUser.id}`, 30, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { action, userId, amount, reason, badgeId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    if (action === 'award_xp') {
      if (!amount || !reason) {
        return NextResponse.json({ success: false, error: 'amount and reason required' }, { status: 400 });
      }
      const ok = await awardXP(userId, amount, reason);
      if (!ok) return NextResponse.json({ success: false, error: 'Could not award XP' }, { status: 500 });
      const updated = await getUserXP(userId);
      return NextResponse.json({ success: true, data: { xp: updated } });
    }

    if (action === 'award_badge') {
      if (!badgeId) {
        return NextResponse.json({ success: false, error: 'badgeId required' }, { status: 400 });
      }
      const ok = await awardBadge(userId, badgeId);
      if (!ok) return NextResponse.json({ success: false, error: 'Could not award badge' }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
