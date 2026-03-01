// ============================================
// MitrAI - Session Bookings API
// GET: list | POST: create | PATCH: accept/decline
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getBookingsForUser, createBooking, updateBooking, getBookingById,
  markSlotEngaged, addNotification
} from '@/lib/store';
import { SessionBooking } from '@/lib/types';
import { NOTIFICATION_TYPES } from '@/lib/constants';
import { sendPushToUser } from '@/lib/store/push-subscriptions';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

// GET /api/bookings?userId=xxx
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    // Ownership: can only view own bookings
    if (userId !== authUser.id) return forbidden();

    const bookings = await getBookingsForUser(userId);
    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Bookings GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST /api/bookings — create a new session request
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`bookings:${authUser.id}`, 20, 60_000)) return rateLimitExceeded();
  try {
    const body = await request.json();
    const { requesterId, requesterName, targetId, targetName, day, hour, topic } = body;
    if (!requesterId || !targetId || !day || hour === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (requesterId !== authUser.id) return forbidden();
    const booking: SessionBooking = {
      id: uuidv4(), requesterId, requesterName: requesterName || 'Someone',
      targetId, targetName: targetName || 'Student', day, hour,
      topic: topic || 'Study Session', status: 'pending', createdAt: new Date().toISOString(),
    };
    await createBooking(booking);
    await addNotification({
      id: uuidv4(), userId: targetId, type: NOTIFICATION_TYPES.SESSION_REQUEST, title: '📅 Session Request',
      message: `${requesterName} wants to study "${topic || 'together'}" on ${day} at ${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`,
      read: false, createdAt: new Date().toISOString(),
    });
    sendPushToUser(targetId, { title: '📅 Session Request', body: `${requesterName} wants to study "${topic || 'together'}" on ${day}`, url: '/session' }).catch(() => {});
    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    console.error('Bookings POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create booking' }, { status: 500 });
  }
}

// PATCH /api/bookings — accept or decline a session request
export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`bookings:${authUser.id}`, 20, 60_000)) return rateLimitExceeded();
  try {
    const body = await request.json();
    const { bookingId, action } = body;
    if (!bookingId || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ success: false, error: 'bookingId and valid action required' }, { status: 400 });
    }
    const booking = await getBookingById(bookingId);
    if (!booking) return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    if (booking.targetId !== authUser.id) return forbidden();

    if (action === 'accept') {
      await updateBooking(bookingId, { status: 'accepted' });
      await markSlotEngaged(booking.requesterId, booking.day, booking.hour, bookingId, booking.targetName);
      await markSlotEngaged(booking.targetId, booking.day, booking.hour, bookingId, booking.requesterName);
      await addNotification({
        id: uuidv4(), userId: booking.requesterId, type: NOTIFICATION_TYPES.SESSION_ACCEPTED, title: '✅ Session Accepted!',
        message: `${booking.targetName} accepted your session request for ${booking.day} at ${booking.hour > 12 ? booking.hour - 12 : booking.hour}${booking.hour >= 12 ? 'PM' : 'AM'}`,
        read: false, createdAt: new Date().toISOString(),
      });
      sendPushToUser(booking.requesterId, { title: '✅ Session Accepted!', body: `${booking.targetName} accepted your session request for ${booking.day}`, url: '/session' }).catch(() => {});
    } else {
      await updateBooking(bookingId, { status: 'declined' });
      await addNotification({
        id: uuidv4(), userId: booking.requesterId, type: NOTIFICATION_TYPES.SESSION_DECLINED, title: '❌ Session Declined',
        message: `${booking.targetName} declined your session request for ${booking.day}`,
        read: false, createdAt: new Date().toISOString(),
      });
      sendPushToUser(booking.requesterId, { title: '❌ Session Declined', body: `${booking.targetName} declined your session request for ${booking.day}`, url: '/session' }).catch(() => {});
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bookings PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update booking' }, { status: 500 });
  }
}
