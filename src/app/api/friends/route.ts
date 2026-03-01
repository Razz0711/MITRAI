// ============================================
// MitrAI - Friends API
// GET: list | POST: send_request/rate/check | PATCH: respond | DELETE: remove
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getFriendRequestsForUser,
  getPendingFriendRequests,
  createFriendRequest,
  updateFriendRequestStatus,
  getFriendsForUser,
  areFriends,
  addFriendship,
  removeFriendship,
  getRatingsForUser,
  getRatingsByUser,
  getAverageRating,
  addRating,
  addNotification,
} from '@/lib/store';
import { NOTIFICATION_TYPES } from '@/lib/constants';
import { sendPushToUser } from '@/lib/store/push-subscriptions';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

// GET /api/friends?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
  }

  const [friends, pendingRequests, allRequests, ratingsReceived, ratingsGiven, avgRating] = await Promise.all([
    getFriendsForUser(userId),
    getPendingFriendRequests(userId),
    getFriendRequestsForUser(userId),
    getRatingsForUser(userId),
    getRatingsByUser(userId),
    getAverageRating(userId),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      friends,
      pendingRequests,
      allRequests,
      ratingsReceived,
      ratingsGiven,
      averageRating: avgRating,
    },
  });
}

// POST /api/friends — send friend request, rate a buddy, or check friendship
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`friends:${authUser.id}`, 20, 60_000)) return rateLimitExceeded();
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'send_request') {
      const { fromUserId, fromUserName, toUserId, toUserName } = body;
      if (!fromUserId || !toUserId) {
        return NextResponse.json({ success: false, error: 'fromUserId and toUserId required' }, { status: 400 });
      }
      if (fromUserId !== authUser.id) return forbidden();
      if (await areFriends(fromUserId, toUserId)) {
        return NextResponse.json({ success: false, error: 'Already friends' }, { status: 409 });
      }
      const request = await createFriendRequest({
        id: uuidv4(), fromUserId, fromUserName: fromUserName || 'Unknown',
        toUserId, toUserName: toUserName || 'Unknown', status: 'pending', createdAt: new Date().toISOString(),
      });
      await addNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: toUserId, type: NOTIFICATION_TYPES.SESSION_REQUEST, title: 'New Friend Request',
        message: `${fromUserName || 'Someone'} sent you a friend request!`,
        read: false, createdAt: new Date().toISOString(),
      });
      sendPushToUser(toUserId, { title: '👋 New Friend Request', body: `${fromUserName || 'Someone'} sent you a friend request!`, url: '/friends' }).catch(() => {});
      return NextResponse.json({ success: true, data: request });
    }

    if (action === 'rate') {
      const { fromUserId, fromUserName, toUserId, toUserName, rating, review } = body;
      if (!fromUserId || !toUserId || !rating || rating < 1 || rating > 10) {
        return NextResponse.json({ success: false, error: 'Valid fromUserId, toUserId and rating (1-10) required' }, { status: 400 });
      }
      if (fromUserId !== authUser.id) return forbidden();
      const newRating = await addRating({
        id: uuidv4(), fromUserId, fromUserName: fromUserName || 'Unknown',
        toUserId, toUserName: toUserName || 'Unknown',
        rating: Number(rating), review: review || '', createdAt: new Date().toISOString(),
      });
      await addNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: toUserId, type: NOTIFICATION_TYPES.GOAL_ACHIEVEMENT, title: 'New Rating Received',
        message: `${fromUserName || 'Someone'} rated you ${rating}/10${review ? `: "${review}"` : ''}`,
        read: false, createdAt: new Date().toISOString(),
      });
      sendPushToUser(toUserId, { title: '⭐ New Rating', body: `${fromUserName || 'Someone'} rated you ${rating}/10`, url: '/friends' }).catch(() => {});
      return NextResponse.json({ success: true, data: newRating });
    }

    if (action === 'check') {
      const { userId1, userId2 } = body;
      const isFriend = await areFriends(userId1, userId2);
      const avg = await getAverageRating(userId2);
      return NextResponse.json({ success: true, data: { isFriend, averageRating: avg } });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Friends POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/friends — respond to a friend request (accept/decline)
export async function PATCH(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`friends:${authUser.id}`, 20, 60_000)) return rateLimitExceeded();
  try {
    const body = await req.json();
    const { requestId, status } = body;
    if (!requestId || !['accepted', 'declined'].includes(status)) {
      return NextResponse.json({ success: false, error: 'requestId and valid status required' }, { status: 400 });
    }
    const { getFriendRequestById } = await import('@/lib/store');
    const existing = await getFriendRequestById(requestId);
    if (!existing) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    if (existing.toUserId !== authUser.id) return forbidden();
    const updated = await updateFriendRequestStatus(requestId, status);
    if (!updated) return NextResponse.json({ success: false, error: 'Failed to update request' }, { status: 500 });
    if (status === 'accepted') {
      await addFriendship({
        id: uuidv4(), user1Id: updated.fromUserId, user1Name: updated.fromUserName,
        user2Id: updated.toUserId, user2Name: updated.toUserName, createdAt: new Date().toISOString(),
      });
      await addNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: updated.fromUserId, type: NOTIFICATION_TYPES.SESSION_ACCEPTED, title: 'Friend Request Accepted!',
        message: `${updated.toUserName} accepted your friend request 🎉`,
        read: false, createdAt: new Date().toISOString(),
      });
      sendPushToUser(updated.fromUserId, { title: '🎉 Friend Request Accepted!', body: `${updated.toUserName} accepted your friend request!`, url: '/friends' }).catch(() => {});
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Friends PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/friends — remove a friend
export async function DELETE(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`friends:${authUser.id}`, 20, 60_000)) return rateLimitExceeded();
  try {
    const body = await req.json();
    const { userId1, userId2 } = body;
    if (!userId1 || !userId2) {
      return NextResponse.json({ success: false, error: 'userId1 and userId2 required' }, { status: 400 });
    }
    if (userId1 !== authUser.id && userId2 !== authUser.id) return forbidden();
    const removed = await removeFriendship(userId1, userId2);
    return NextResponse.json({ success: true, data: { removed } });
  } catch (error) {
    console.error('Friends DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
