// ============================================
// MitrAI - Friends API (Friend Requests + Friendships)
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
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

// GET /api/friends?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
  }

  const friends = await getFriendsForUser(userId);
  const pendingRequests = await getPendingFriendRequests(userId);
  const allRequests = await getFriendRequestsForUser(userId);
  const ratingsReceived = await getRatingsForUser(userId);
  const ratingsGiven = await getRatingsByUser(userId);
  const avgRating = await getAverageRating(userId);

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

// POST /api/friends
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ── Send Friend Request ──
      case 'send_request': {
        const { fromUserId, fromUserName, toUserId, toUserName } = body;
        if (!fromUserId || !toUserId) {
          return NextResponse.json({ success: false, error: 'fromUserId and toUserId required' }, { status: 400 });
        }
        // Ownership: can only send requests from yourself
        if (fromUserId !== authUser.id) return forbidden();
        // Already friends?
        if (await areFriends(fromUserId, toUserId)) {
          return NextResponse.json({ success: false, error: 'Already friends' }, { status: 409 });
        }
        const request = await createFriendRequest({
          id: uuidv4(),
          fromUserId,
          fromUserName: fromUserName || 'Unknown',
          toUserId,
          toUserName: toUserName || 'Unknown',
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
        // Notify the recipient about the friend request
        await addNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: toUserId,
          type: 'session_request',
          title: 'New Friend Request',
          message: `${fromUserName || 'Someone'} sent you a friend request!`,
          read: false,
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, data: request });
      }

      // ── Accept / Decline Friend Request ──
      case 'respond_request': {
        const { requestId, status } = body;
        if (!requestId || !['accepted', 'declined'].includes(status)) {
          return NextResponse.json({ success: false, error: 'requestId and valid status required' }, { status: 400 });
        }
        const updated = await updateFriendRequestStatus(requestId, status);
        if (!updated) {
          return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
        }
        // Ownership: only the recipient can respond
        if (updated.toUserId !== authUser.id) return forbidden();
        // If accepted, create friendship
        if (status === 'accepted') {
          await addFriendship({
            id: uuidv4(),
            user1Id: updated.fromUserId,
            user1Name: updated.fromUserName,
            user2Id: updated.toUserId,
            user2Name: updated.toUserName,
            createdAt: new Date().toISOString(),
          });
          // Notify the original sender that their request was accepted
          await addNotification({
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            userId: updated.fromUserId,
            type: 'session_accepted',
            title: 'Friend Request Accepted!',
            message: `${updated.toUserName} accepted your friend request 🎉`,
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
        return NextResponse.json({ success: true, data: updated });
      }

      // ── Remove Friend ──
      case 'remove_friend': {
        const { userId1, userId2 } = body;
        if (!userId1 || !userId2) {
          return NextResponse.json({ success: false, error: 'userId1 and userId2 required' }, { status: 400 });
        }
        // Ownership: only a party in the friendship can remove it
        if (userId1 !== authUser.id && userId2 !== authUser.id) return forbidden();
        const removed = await removeFriendship(userId1, userId2);
        return NextResponse.json({ success: true, data: { removed } });
      }

      // ── Rate a Buddy ──
      case 'rate': {
        const { fromUserId, fromUserName, toUserId, toUserName, rating, review } = body;
        if (!fromUserId || !toUserId || !rating || rating < 1 || rating > 10) {
          return NextResponse.json({ success: false, error: 'Valid fromUserId, toUserId and rating (1-10) required' }, { status: 400 });
        }
        // Ownership: can only rate from yourself
        if (fromUserId !== authUser.id) return forbidden();
        const newRating = await addRating({
          id: uuidv4(),
          fromUserId,
          fromUserName: fromUserName || 'Unknown',
          toUserId,
          toUserName: toUserName || 'Unknown',
          rating: Number(rating),
          review: review || '',
          createdAt: new Date().toISOString(),
        });
        // Notify the user they received a rating
        await addNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: toUserId,
          type: 'goal_achievement',
          title: 'New Rating Received',
          message: `${fromUserName || 'Someone'} rated you ${rating}/10${review ? `: "${review}"` : ''}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, data: newRating });
      }

      // ── Check friendship status ──
      case 'check': {
        const { userId1, userId2 } = body;
        const isFriend = await areFriends(userId1, userId2);
        const avg = await getAverageRating(userId2);
        return NextResponse.json({ success: true, data: { isFriend, averageRating: avg } });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Friends API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
