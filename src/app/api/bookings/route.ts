// ============================================
// MitrAI - Session Bookings API
// GET: list bookings for a user
// POST: create / accept / decline booking
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getBookingsForUser, createBooking, updateBooking, getBookingById,
  markSlotEngaged, addNotification
} from '@/lib/store';
import { SessionBooking } from '@/lib/types';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

// GET /api/bookings?userId=xxx
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    const bookings = await getBookingsForUser(userId);
    return NextResponse.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Bookings GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST /api/bookings — create or update a booking
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await request.json();
    const { action } = body;

    // CREATE a new session request
    if (action === 'create') {
      const { requesterId, requesterName, targetId, targetName, day, hour, topic } = body;

      if (!requesterId || !targetId || !day || hour === undefined) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
      }

      const booking: SessionBooking = {
        id: uuidv4(),
        requesterId,
        requesterName: requesterName || 'Someone',
        targetId,
        targetName: targetName || 'Student',
        day,
        hour,
        topic: topic || 'Study Session',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await createBooking(booking);

      // Notify target
      await addNotification({
        id: uuidv4(),
        userId: targetId,
        type: 'session_request',
        title: '📅 Session Request',
        message: `${requesterName} wants to study "${topic || 'together'}" on ${day} at ${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, data: booking });
    }

    // ACCEPT a session request
    if (action === 'accept') {
      const { bookingId } = body;
      const booking = await getBookingById(bookingId);
      if (!booking) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      await updateBooking(bookingId, { status: 'accepted' });

      // Mark both users as engaged for that slot
      await markSlotEngaged(booking.requesterId, booking.day, booking.hour, bookingId, booking.targetName);
      await markSlotEngaged(booking.targetId, booking.day, booking.hour, bookingId, booking.requesterName);

      // Notify requester
      await addNotification({
        id: uuidv4(),
        userId: booking.requesterId,
        type: 'session_accepted',
        title: '✅ Session Accepted!',
        message: `${booking.targetName} accepted your session request for ${booking.day} at ${booking.hour > 12 ? booking.hour - 12 : booking.hour}${booking.hour >= 12 ? 'PM' : 'AM'}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    // DECLINE a session request
    if (action === 'decline') {
      const { bookingId } = body;
      const booking = await getBookingById(bookingId);
      if (!booking) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      await updateBooking(bookingId, { status: 'declined' });

      // Notify requester
      await addNotification({
        id: uuidv4(),
        userId: booking.requesterId,
        type: 'session_declined',
        title: '❌ Session Declined',
        message: `${booking.targetName} declined your session request for ${booking.day}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Bookings POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process booking' }, { status: 500 });
  }
}
