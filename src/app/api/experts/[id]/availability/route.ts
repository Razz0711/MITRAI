// ============================================
// MitrRAI - Expert Availability API
// GET: Available slots | POST: Admin set slots
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { verifyAdminAccess } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/experts/[id]/availability?date=2026-03-30
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date'); // optional: specific date

  try {
    // Get recurring weekly slots
    const { data: slots, error } = await supabase
      .from('expert_availability')
      .select('*')
      .eq('expert_id', id)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    // If a specific date is requested, check which slots are already booked
    let bookedSlots: { start_time: string; end_time: string }[] = [];
    if (dateStr) {
      const { data: bookings } = await supabase
        .from('expert_bookings')
        .select('start_time, end_time')
        .eq('expert_id', id)
        .eq('booking_date', dateStr)
        .eq('status', 'confirmed');

      bookedSlots = bookings || [];
    }

    // Format response
    const availability = (slots || []).map(slot => ({
      id: slot.id,
      dayOfWeek: slot.day_of_week,
      dayName: DAY_NAMES[slot.day_of_week],
      startTime: slot.start_time,
      endTime: slot.end_time,
      isBooked: dateStr
        ? bookedSlots.some(b => b.start_time === slot.start_time)
        : false,
    }));

    return NextResponse.json({ success: true, data: availability });
  } catch (err) {
    console.error('Availability GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch availability' }, { status: 500 });
  }
}

// POST /api/experts/[id]/availability — Admin set slots
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const adminKey = req.nextUrl.searchParams.get('adminKey');
  if (!await verifyAdminAccess(adminKey)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slots } = await req.json();
    // slots: [{ day_of_week: 1, start_time: '10:00', end_time: '10:45' }, ...]

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ success: false, error: 'slots array required' }, { status: 400 });
    }

    // Deactivate old slots
    await supabase
      .from('expert_availability')
      .update({ is_active: false })
      .eq('expert_id', id);

    // Insert new slots
    const { data, error } = await supabase
      .from('expert_availability')
      .insert(
        slots.map((s: { day_of_week: number; start_time: string; end_time: string }) => ({
          expert_id: id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_active: true,
        }))
      )
      .select('id');

    if (error) throw error;

    return NextResponse.json({ success: true, data, message: `${slots.length} slots set` });
  } catch (err) {
    console.error('Availability POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to set availability' }, { status: 500 });
  }
}
