// ============================================
// MitrRAI - Circle Poll Vote API
// POST /api/circles/[id]/messages/vote { messageId, optionIndex }
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { votePoll, getPollVotes } from '@/lib/store/circles';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`poll_vote:${authUser.id}`, 30, 60_000)) return rateLimitExceeded();

  const body = await req.json().catch(() => ({}));
  const { messageId, optionIndex } = body;

  if (!messageId || optionIndex === undefined || optionIndex === null) {
    return NextResponse.json({ success: false, error: 'messageId and optionIndex required' }, { status: 400 });
  }

  const ok = await votePoll(messageId, authUser.id, optionIndex);
  if (!ok) return NextResponse.json({ success: false, error: 'Failed to vote' }, { status: 500 });

  // Return updated votes
  const votes = await getPollVotes(messageId);
  return NextResponse.json({ success: true, votes });
}
