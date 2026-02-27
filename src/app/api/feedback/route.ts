// ============================================
// MitrAI - Feedback API
// POST: submit feedback
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createFeedback } from '@/lib/store';
import { Feedback } from '@/lib/types';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

// POST /api/feedback — submit feedback
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`feedback:${authUser.id}`, 5, 60_000)) return rateLimitExceeded();
  try {
    const body = await request.json();
    const { name, email, type, rating, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    const feedback: Feedback = {
      id: uuidv4(),
      userId: authUser.id,
      name: name || 'Anonymous',
      email: email || '',
      type: type || 'feedback',
      rating: Number(rating) || 0,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    await createFeedback(feedback);
    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error('Feedback POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit feedback' }, { status: 500 });
  }
}
