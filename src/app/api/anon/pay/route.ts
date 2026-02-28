// ============================================
// MitrAI - Payment Submission API
// POST /api/anon/pay { plan, transactionId, upiRef }
// GET  /api/anon/pay — check payment status
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { submitPayment, getUserPaymentStatus } from '@/lib/store/anon';
import { ANON_PRICING } from '@/lib/anon-aliases';

export const dynamic = 'force-dynamic';

// GET — check current payment status
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const payment = await getUserPaymentStatus(authUser.id);
  return NextResponse.json({ success: true, data: { payment } });
}

// POST — submit a new payment
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = authUser.id;
  if (!rateLimit(`anon-pay:${userId}`, 3, 300_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { plan, transactionId, upiRef } = body;

    // Validate plan
    const tier = ANON_PRICING.find(t => t.plan === plan);
    if (!tier) {
      return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 });
    }

    // Validate transaction ID
    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length < 4) {
      return NextResponse.json({ success: false, error: 'Valid transaction/reference ID required (min 4 characters)' }, { status: 400 });
    }

    const result = await submitPayment(userId, plan, tier.price, transactionId, upiRef);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Payment submitted! Admin will verify within 24 hours.' });
  } catch (error) {
    console.error('Payment submit error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
