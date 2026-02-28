// ============================================
// MitrAI - Coupon Redemption API
// POST /api/anon/redeem { code }
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { redeemCoupon } from '@/lib/store/anon';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = authUser.id;
  if (!rateLimit(`anon-redeem:${userId}`, 5, 300_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Coupon code required' }, { status: 400 });
    }

    const result = await redeemCoupon(userId, code);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: { pass: result.pass } });
  } catch (error) {
    console.error('Coupon redeem error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
