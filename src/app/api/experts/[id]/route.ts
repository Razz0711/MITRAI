// ============================================
// MitrRAI - Expert Detail API
// GET: Detail | PUT: Admin update | DELETE: Admin deactivate
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { verifyAdminAccess } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/experts/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { data, error } = await supabase
      .from('experts')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Expert GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch expert' }, { status: 500 });
  }
}

// PUT /api/experts/[id] — Admin update
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const adminKey = req.nextUrl.searchParams.get('adminKey');
  if (!await verifyAdminAccess(adminKey)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Allow updating any field
    const allowedFields = [
      'name', 'title', 'gender', 'about', 'avatar_url',
      'experience_years', 'qualifications', 'languages',
      'expertise', 'specializations', 'awards', 'work_experience',
      'price_per_session', 'session_duration_mins', 'booking_url',
      'max_bookings_per_day', 'is_active', 'is_featured', 'sort_order',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('experts')
      .update(updates)
      .eq('id', id)
      .select('id, name')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Expert PUT error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update expert' }, { status: 500 });
  }
}

// DELETE /api/experts/[id] — Admin soft-delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const adminKey = req.nextUrl.searchParams.get('adminKey');
  if (!await verifyAdminAccess(adminKey)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from('experts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Expert deactivated' });
  } catch (err) {
    console.error('Expert DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete expert' }, { status: 500 });
  }
}
