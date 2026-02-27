// ============================================
// MitrAI - Calendar API
// GET: get events for a user (with optional date range)
// POST: create / update / delete events
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getCalendarEventsForUser,
  getCalendarEventsByDateRange,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/store';
import { CalendarEvent } from '@/lib/types';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

// GET /api/calendar?userId=xxx&start=2026-02-01&end=2026-02-28
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    let events: CalendarEvent[];
    if (start && end) {
      events = await getCalendarEventsByDateRange(userId, start, end);
    } else {
      events = await getCalendarEventsForUser(userId);
    }

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST /api/calendar
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const { userId, title, description, type, date, startTime, endTime, room, recurring, recurringDay, color, buddyId, buddyName } = body;
        if (!userId || !title || !date || !startTime) {
          return NextResponse.json({ success: false, error: 'userId, title, date, and startTime required' }, { status: 400 });
        }

        const event: CalendarEvent = {
          id: uuidv4(),
          userId,
          title,
          description: description || '',
          type: type || 'class',
          date,
          startTime,
          endTime: endTime || '',
          room: room || '',
          recurring: recurring || false,
          recurringDay: recurringDay || '',
          color: color || '',
          buddyId: buddyId || '',
          buddyName: buddyName || '',
          createdAt: new Date().toISOString(),
        };

        await createCalendarEvent(event);
        return NextResponse.json({ success: true, data: event });
      }

      case 'update': {
        const { eventId, updates } = body;
        if (!eventId) {
          return NextResponse.json({ success: false, error: 'eventId required' }, { status: 400 });
        }
        const updated = await updateCalendarEvent(eventId, updates || {});
        return NextResponse.json({ success: true, data: updated });
      }

      case 'delete': {
        const { eventId } = body;
        if (!eventId) {
          return NextResponse.json({ success: false, error: 'eventId required' }, { status: 400 });
        }
        const deleted = await deleteCalendarEvent(eventId);
        return NextResponse.json({ success: true, data: { deleted } });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process calendar action' }, { status: 500 });
  }
}
