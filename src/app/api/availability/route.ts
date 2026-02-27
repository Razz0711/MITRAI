// ============================================
// MitrAI - Availability API
// GET: get user availability grid
// POST: update availability / book slot
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserAvailability, setUserAvailability, markSlotEngaged } from '@/lib/store';
import { UserAvailability, TimeSlot, Day } from '@/lib/types';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

const ALL_DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6AM to 11PM

// Generate default availability (all unavailable)
function generateDefaultSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (const day of ALL_DAYS) {
    for (const hour of HOURS) {
      slots.push({ day, hour, status: 'unavailable' });
    }
  }
  return slots;
}

// GET /api/availability?userId=xxx
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    let avail = await getUserAvailability(userId);

    // If no availability set, create default
    if (!avail) {
      avail = {
        userId,
        slots: generateDefaultSlots(),
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({ success: true, data: avail });
  } catch (error) {
    console.error('Availability GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch availability' }, { status: 500 });
  }
}

// POST /api/availability — update user availability
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await request.json();
    const { userId, slots, action } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    // Ownership: can only update own availability
    if (action === 'update' || action === 'engage') {
      if (userId !== authUser.id) return forbidden();
    }

    // Action: 'update' — bulk update slots
    if (action === 'update' && slots) {
      const avail: UserAvailability = {
        userId,
        slots,
        updatedAt: new Date().toISOString(),
      };
      await setUserAvailability(avail);
      return NextResponse.json({ success: true, data: avail });
    }

    // Action: 'engage' — mark a slot as engaged (after session accepted)
    if (action === 'engage') {
      const { day, hour, sessionId, buddyName } = body;
      await markSlotEngaged(userId, day, hour, sessionId, buddyName);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Availability POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update availability' }, { status: 500 });
  }
}
