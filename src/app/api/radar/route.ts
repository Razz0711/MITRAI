// ============================================
// MitrAI - Radar API
// Campus discovery: broadcast, list active pings, go offline
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/radar?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = req.nextUrl.searchParams.get('userId') || authUser.id;

  try {
    // Get all active (non-expired) pings
    const now = new Date().toISOString();
    const { data: pings, error } = await supabase
      .from('radar_pings')
      .select('*')
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('radar GET error:', error);
      return NextResponse.json({ success: true, data: { pings: [], myPing: null } });
    }

    const formatted = (pings || []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      userId: p.user_id as string,
      userName: p.user_name as string,
      activityId: p.activity_id as string,
      zone: p.zone as string,
      note: (p.note || '') as string,
      isAnonymous: (p.is_anonymous || false) as boolean,
      createdAt: p.created_at as string,
      expiresAt: p.expires_at as string,
    }));

    const myPing = formatted.find(p => p.userId === userId) || null;

    return NextResponse.json({
      success: true,
      data: { pings: formatted, myPing },
    });
  } catch (err) {
    console.error('radar GET catch:', err);
    return NextResponse.json({ success: true, data: { pings: [], myPing: null } });
  }
}

// POST /api/radar — broadcast a ping
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`radar:${authUser.id}`, 5, 60_000)) return rateLimitExceeded();

  try {
    const body = await req.json();
    const { userId, userName, activityId, zone, note, isAnonymous } = body;

    if (!userId || !activityId) {
      return NextResponse.json({ success: false, error: 'userId and activityId required' }, { status: 400 });
    }

    // Remove any existing ping from this user
    await supabase.from('radar_pings').delete().eq('user_id', userId);

    // Create new ping (expires in 2 hours)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const id = `radar_${uuidv4().slice(0, 8)}`;

    const { error } = await supabase.from('radar_pings').insert({
      id,
      user_id: userId,
      user_name: userName || 'Student',
      activity_id: activityId,
      zone: zone || 'Hostel',
      note: (note || '').slice(0, 100),
      is_anonymous: isAnonymous || false,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    if (error) {
      console.error('radar POST error:', error);
      return NextResponse.json({ success: false, error: 'Could not broadcast' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/radar — stop broadcasting
export async function DELETE(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    await supabase.from('radar_pings').delete().eq('user_id', userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
