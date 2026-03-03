// ============================================
// MitrAI - Skills API
// Skill swap: create offers, list, delete
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/skills?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = req.nextUrl.searchParams.get('userId') || authUser.id;

  try {
    const { data: offers, error } = await supabase
      .from('skill_offers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('skills GET error:', error);
      return NextResponse.json({ success: true, data: { offers: [], myOffer: null } });
    }

    const formatted = (offers || []).map((o: Record<string, unknown>) => ({
      id: o.id as string,
      userId: o.user_id as string,
      userName: o.user_name as string,
      canTeach: (o.can_teach || []) as string[],
      wantToLearn: (o.want_to_learn || []) as string[],
      description: (o.description || '') as string,
      isActive: o.is_active as boolean,
      createdAt: o.created_at as string,
    }));

    const myOffer = formatted.find(o => o.userId === userId) || null;

    return NextResponse.json({
      success: true,
      data: { offers: formatted, myOffer },
    });
  } catch (err) {
    console.error('skills GET catch:', err);
    return NextResponse.json({ success: true, data: { offers: [], myOffer: null } });
  }
}

// POST /api/skills — create or update offer
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`skills:${authUser.id}`, 5, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { userId, userName, canTeach, wantToLearn, description } = body;

    if (!userId || !canTeach?.length || !wantToLearn?.length) {
      return NextResponse.json({ success: false, error: 'userId, canTeach, and wantToLearn required' }, { status: 400 });
    }

    // Remove any existing offer from this user
    await supabase.from('skill_offers').delete().eq('user_id', userId);

    const id = `skill_${uuidv4().slice(0, 8)}`;

    const { error } = await supabase.from('skill_offers').insert({
      id,
      user_id: userId,
      user_name: userName || 'Student',
      can_teach: canTeach.slice(0, 5),
      want_to_learn: wantToLearn.slice(0, 5),
      description: (description || '').slice(0, 200),
      is_active: true,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('skills POST error:', error);
      return NextResponse.json({ success: false, error: 'Could not create offer' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/skills — deactivate offer
export async function DELETE(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    await supabase.from('skill_offers').delete().eq('user_id', userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
