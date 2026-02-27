// ============================================
// MitrAI - Calendar API
// GET: get events | POST: create | PUT: update | DELETE: delete
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getCalendarEventsForUser,
  getCalendarEventsByDateRange,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/store';
import { CalendarEvent } from '@/lib/types';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

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

    // Ownership: can only view own calendar
    if (userId !== authUser.id) return forbidden();

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

// POST /api/calendar — create a new event
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`calendar:${authUser.id}`, 30, 60_000)) return rateLimitExceeded();
  try {
    const body = await request.json();
    const { userId, title, description, type, date, startTime, endTime, room, recurring, recurringDay, color, buddyId, buddyName } = body;
    if (!userId || !title || !date || !startTime) {
      return NextResponse.json({ success: false, error: 'userId, title, date, and startTime required' }, { status: 400 });
    }
    if (userId !== authUser.id) return forbidden();

    const event: CalendarEvent = {
      id: uuidv4(), userId, title, description: description || '', type: type || 'class',
      date, startTime, endTime: endTime || '', room: room || '',
      recurring: recurring || false, recurringDay: recurringDay || '',
      color: color || '', buddyId: buddyId || '', buddyName: buddyName || '',
      createdAt: new Date().toISOString(),
    };
    await createCalendarEvent(event);
    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
  }
}

// PUT /api/calendar — update an existing event
export async function PUT(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`calendar:${authUser.id}`, 30, 60_000)) return rateLimitExceeded();
  try {
    const body = await request.json();
    const { eventId, updates } = body;
    if (!eventId) return NextResponse.json({ success: false, error: 'eventId required' }, { status: 400 });
    const eventToUpdate = await getCalendarEventById(eventId);
    if (!eventToUpdate) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    if (eventToUpdate.userId !== authUser.id) return forbidden();
    const updated = await updateCalendarEvent(eventId, updates || {});
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Calendar PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE /api/calendar — delete an event
export async function DELETE(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`calendar:${authUser.id}`, 30, 60_000)) return rateLimitExceeded();
  try {
    const body = await request.json();
    const { eventId } = body;
    if (!eventId) return NextResponse.json({ success: false, error: 'eventId required' }, { status: 400 });
    const eventToDelete = await getCalendarEventById(eventId);
    if (!eventToDelete) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    if (eventToDelete.userId !== authUser.id) return forbidden();
    const deleted = await deleteCalendarEvent(eventId);
    return NextResponse.json({ success: true, data: { deleted } });
  } catch (error) {
    console.error('Calendar DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 });
  }
}
