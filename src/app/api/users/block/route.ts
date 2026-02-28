// ============================================
// MitrAI - User Blocking & Reporting API
// POST: block/unblock a user, or report a user
// GET: get blocked users list
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

// GET /api/users/block?userId=xxx — get list of users blocked by this user
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const userId = req.nextUrl.searchParams.get('userId');
  if (userId !== authUser.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_user_id, reason, created_at')
      .eq('blocker_id', authUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('[Block] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch blocked users' }, { status: 500 });
  }
}

// POST /api/users/block — block, unblock, or report a user
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await req.json();
    const { action, targetUserId, reason, details } = body;

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'targetUserId is required' }, { status: 400 });
    }

    if (targetUserId === authUser.id) {
      return NextResponse.json({ success: false, error: 'Cannot block/report yourself' }, { status: 400 });
    }

    // ── Block a user ──
    if (action === 'block') {
      if (!rateLimit(`block:${authUser.id}`, 20, 3600_000)) return rateLimitExceeded();

      const { error } = await supabase.from('user_blocks').upsert({
        blocker_id: authUser.id,
        blocked_user_id: targetUserId,
        reason: reason || '',
        created_at: new Date().toISOString(),
      }, { onConflict: 'blocker_id,blocked_user_id' });

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'User blocked' });
    }

    // ── Unblock a user ──
    if (action === 'unblock') {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', authUser.id)
        .eq('blocked_user_id', targetUserId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'User unblocked' });
    }

    // ── Report a user ──
    if (action === 'report') {
      if (!reason) {
        return NextResponse.json({ success: false, error: 'Reason is required for reporting' }, { status: 400 });
      }
      if (!rateLimit(`report:${authUser.id}`, 5, 3600_000)) return rateLimitExceeded();

      const { error } = await supabase.from('user_reports').insert({
        reporter_id: authUser.id,
        reported_user_id: targetUserId,
        reason,
        details: details || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Report submitted. Our team will review it.' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Use block, unblock, or report.' }, { status: 400 });
  } catch (error) {
    console.error('[Block/Report] Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
