// ============================================
// MitrAI - Subscription API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscription, setUserSubscription } from '@/lib/store';
import { Subscription } from '@/lib/types';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

// GET /api/subscription?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
  }

  const sub = await getUserSubscription(userId);

  // Default to free plan
  if (!sub) {
    return NextResponse.json({
      success: true,
      data: {
        userId,
        plan: 'free',
        startDate: '',
        endDate: '',
        status: 'active',
        createdAt: '',
      } as Subscription,
    });
  }

  return NextResponse.json({ success: true, data: sub });
}

// POST /api/subscription
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await req.json();
    const { userId, plan, transactionId, action, targetUserId, adminKey } = body;

    // ── Admin actions (approve / reject) ──
    if (action === 'approve' || action === 'reject') {
      if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'targetUserId required' }, { status: 400 });
      }
      if (action === 'approve') {
        const { approveSubscription } = await import('@/lib/store');
        const ok = await approveSubscription(targetUserId);
        return NextResponse.json({ success: ok, message: ok ? 'Subscription approved' : 'Failed to approve' });
      } else {
        const { rejectSubscription } = await import('@/lib/store');
        const ok = await rejectSubscription(targetUserId);
        return NextResponse.json({ success: ok, message: ok ? 'Subscription rejected' : 'Failed to reject' });
      }
    }

    // ── List pending (admin) ──
    if (action === 'list-pending') {
      if (adminKey !== process.env.ADMIN_KEY) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      const { getAllPendingSubscriptions } = await import('@/lib/store');
      const pending = await getAllPendingSubscriptions();
      return NextResponse.json({ success: true, data: pending });
    }

    // ── Normal subscription flow ──
    if (!userId || !plan) {
      return NextResponse.json({ success: false, error: 'userId and plan required' }, { status: 400 });
    }

    if (!['free', 'monthly', 'yearly'].includes(plan)) {
      return NextResponse.json({ success: false, error: 'Invalid plan. Must be free, monthly, or yearly' }, { status: 400 });
    }

    const now = new Date();

    // Free plan — activate immediately
    if (plan === 'free') {
      const subscription = await setUserSubscription({
        userId, plan, startDate: now.toISOString(), endDate: '', status: 'active', transactionId: '', createdAt: now.toISOString(),
      });
      return NextResponse.json({ success: true, data: subscription });
    }

    // Paid plans — require transaction ID, set to PENDING
    if (!transactionId || transactionId.trim().length < 4) {
      return NextResponse.json({ success: false, error: 'Please enter a valid UPI Transaction / UTR ID (at least 4 characters)' }, { status: 400 });
    }

    const subscription = await setUserSubscription({
      userId,
      plan,
      startDate: now.toISOString(),
      endDate: '',  // will be set on approval
      status: 'pending',
      transactionId: transactionId.trim(),
      createdAt: now.toISOString(),
    });

    return NextResponse.json({ success: true, data: subscription, message: 'Payment submitted for verification' });
  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
