// ============================================
// MitrRAI - Expert Booking API
// POST: Book a session
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/experts/[id]/book
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Rate limit: 3 bookings per hour
  if (!rateLimit(`booking:${user.id}`, 3, 3600_000)) return rateLimitExceeded();

  try {
    const { date, startTime, endTime, notes, sessionMode } = await req.json();

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ success: false, error: 'date, startTime, endTime required' }, { status: 400 });
    }

    // 1. Check expert exists and is active
    const { data: expert, error: expertError } = await supabase
      .from('experts')
      .select('id, name, max_bookings_per_day, booking_url, session_duration_mins')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (expertError || !expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    // 2. Check for double-booking
    const { data: existing } = await supabase
      .from('expert_bookings')
      .select('id')
      .eq('expert_id', id)
      .eq('booking_date', date)
      .eq('start_time', startTime)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, error: 'This slot is already booked' }, { status: 409 });
    }

    // 3. Check max bookings per day
    const { count } = await supabase
      .from('expert_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('expert_id', id)
      .eq('booking_date', date)
      .eq('status', 'confirmed');

    if ((count || 0) >= expert.max_bookings_per_day) {
      return NextResponse.json({ success: false, error: 'Expert is fully booked for this day' }, { status: 409 });
    }

    // 4. Check user doesn't have an existing booking with same expert on same day
    const { data: userExisting } = await supabase
      .from('expert_bookings')
      .select('id')
      .eq('expert_id', id)
      .eq('user_id', user.id)
      .eq('booking_date', date)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (userExisting) {
      return NextResponse.json({ success: false, error: 'You already have a booking with this expert on this date' }, { status: 409 });
    }

    // 5. Create booking
    const meetingLink = expert.booking_url || null;

    const { data: booking, error: bookingError } = await supabase
      .from('expert_bookings')
      .insert({
        expert_id: id,
        user_id: user.id,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        session_mode: sessionMode || 'video',
        meeting_link: meetingLink,
        status: 'confirmed',
      })
      .select('id, booking_date, start_time, end_time, meeting_link')
      .single();

    if (bookingError) throw bookingError;

    return NextResponse.json({
      success: true,
      data: {
        ...booking,
        expertName: expert.name,
        sessionDuration: expert.session_duration_mins,
      },
    });
  } catch (err) {
    console.error('Booking POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to book session' }, { status: 500 });
  }
}
