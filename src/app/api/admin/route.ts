// ============================================
// MitrAI - Admin Dashboard API
// Protected by ADMIN_KEY environment variable
// GET: dashboard stats & pending items
// POST: admin actions (approve sub, resolve report, etc.)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import { generateCoupons, listCoupons, getAnonStats, listPendingPayments, approvePayment, rejectPayment } from '@/lib/store/anon';

export const dynamic = 'force-dynamic';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

function verifyAdmin(adminKey: string | null): boolean {
  const expected = process.env.ADMIN_KEY || '';
  const provided = String(adminKey || '');
  if (!expected || expected.length === 0) return false;
  if (expected.length !== provided.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

// GET /api/admin?adminKey=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const adminKey = req.nextUrl.searchParams.get('adminKey');
  if (!verifyAdmin(adminKey)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Gather dashboard stats in parallel
    const [usersResult, subsResult, reportsResult, materialsResult, feedbackResult, anonStats, coupons, pendingPayments] = await Promise.all([
      supabase.from('students').select('id, name, email, department, year_level, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(50),
      supabase.from('subscriptions').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('user_reports').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('materials').select('id', { count: 'exact' }),
      supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(20),
      getAnonStats(),
      listCoupons(),
      listPendingPayments(),
    ]);

    const totalUsers = usersResult.count || 0;
    const recentUsers = usersResult.data || [];
    const pendingSubs = subsResult.data || [];
    const pendingReports = reportsResult.data || [];
    const totalMaterials = materialsResult.count || 0;
    const recentFeedback = feedbackResult.data || [];

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalMaterials,
          pendingSubscriptions: pendingSubs.length,
          pendingReports: pendingReports.length,
        },
        recentUsers,
        pendingSubscriptions: pendingSubs,
        pendingReports,
        recentFeedback,
        anonStats,
        coupons,
        pendingPayments,
      },
    });
  } catch (error) {
    console.error('[Admin] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load admin data' }, { status: 500 });
  }
}

// POST /api/admin — admin actions
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  try {
    const body = await req.json();
    const { adminKey, action, targetId } = body;

    if (!verifyAdmin(adminKey)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // ── Approve subscription ──
    if (action === 'approve-subscription') {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1); // 1 month for all paid plans

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active', start_date: now.toISOString(), end_date: endDate.toISOString() })
        .eq('user_id', targetId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Subscription approved' });
    }

    // ── Reject subscription ──
    if (action === 'reject-subscription') {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', targetId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Subscription rejected' });
    }

    // ── Resolve report ──
    if (action === 'resolve-report') {
      const { resolution } = body;
      const { error } = await supabase
        .from('user_reports')
        .update({ status: resolution || 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', targetId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Report resolved' });
    }

    // ── Dismiss report ──
    if (action === 'dismiss-report') {
      const { error } = await supabase
        .from('user_reports')
        .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
        .eq('id', targetId);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Report dismissed' });
    }

    // ── Generate anon coupons ──
    if (action === 'generate-coupons') {
      const { plan, count, maxUses, expiresAt } = body;
      if (!plan || !count) {
        return NextResponse.json({ success: false, error: 'plan and count required' }, { status: 400 });
      }
      const codes = await generateCoupons(plan, Math.min(count, 100), maxUses || 1, authUser.id, expiresAt);
      return NextResponse.json({ success: true, data: { codes } });
    }

    // ── Approve anon payment ──
    if (action === 'approve-payment') {
      const result = await approvePayment(targetId, authUser.id);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return NextResponse.json({ success: true, message: 'Payment approved, pass activated!' });
    }

    // ── Reject anon payment ──
    if (action === 'reject-payment') {
      const { reason } = body;
      const result = await rejectPayment(targetId, authUser.id, reason);
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return NextResponse.json({ success: true, message: 'Payment rejected' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Admin] POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
