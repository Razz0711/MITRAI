// ============================================
// MitrAI - Subscription API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserSubscription, setUserSubscription } from '@/lib/store';
import { Subscription } from '@/lib/types';

// GET /api/subscription?userId=xxx
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
  }

  const sub = getUserSubscription(userId);

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
  try {
    const body = await req.json();
    const { userId, plan } = body;

    if (!userId || !plan) {
      return NextResponse.json({ success: false, error: 'userId and plan required' }, { status: 400 });
    }

    if (!['free', 'monthly', 'yearly'].includes(plan)) {
      return NextResponse.json({ success: false, error: 'Invalid plan. Must be free, monthly, or yearly' }, { status: 400 });
    }

    const now = new Date();
    let endDate = '';

    if (plan === 'monthly') {
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      endDate = end.toISOString();
    } else if (plan === 'yearly') {
      const end = new Date(now);
      end.setFullYear(end.getFullYear() + 1);
      endDate = end.toISOString();
    }

    const subscription = setUserSubscription({
      userId,
      plan,
      startDate: now.toISOString(),
      endDate,
      status: 'active',
      createdAt: now.toISOString(),
    });

    return NextResponse.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
