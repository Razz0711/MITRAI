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
} from '@/lib/store';

// GET /api/friends?userId=xxx
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
  }

  const friends = getFriendsForUser(userId);
  const pendingRequests = getPendingFriendRequests(userId);
  const allRequests = getFriendRequestsForUser(userId);
  const ratingsReceived = getRatingsForUser(userId);
  const ratingsGiven = getRatingsByUser(userId);
  const avgRating = getAverageRating(userId);

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
        // Already friends?
        if (areFriends(fromUserId, toUserId)) {
          return NextResponse.json({ success: false, error: 'Already friends' }, { status: 409 });
        }
        const request = createFriendRequest({
          id: uuidv4(),
          fromUserId,
          fromUserName: fromUserName || 'Unknown',
          toUserId,
          toUserName: toUserName || 'Unknown',
          status: 'pending',
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
        const updated = updateFriendRequestStatus(requestId, status);
        if (!updated) {
          return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
        }
        // If accepted, create friendship
        if (status === 'accepted') {
          addFriendship({
            id: uuidv4(),
            user1Id: updated.fromUserId,
            user1Name: updated.fromUserName,
            user2Id: updated.toUserId,
            user2Name: updated.toUserName,
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
        const removed = removeFriendship(userId1, userId2);
        return NextResponse.json({ success: true, data: { removed } });
      }

      // ── Rate a Buddy ──
      case 'rate': {
        const { fromUserId, fromUserName, toUserId, toUserName, rating, review } = body;
        if (!fromUserId || !toUserId || !rating || rating < 1 || rating > 10) {
          return NextResponse.json({ success: false, error: 'Valid fromUserId, toUserId and rating (1-10) required' }, { status: 400 });
        }
        const newRating = addRating({
          id: uuidv4(),
          fromUserId,
          fromUserName: fromUserName || 'Unknown',
          toUserId,
          toUserName: toUserName || 'Unknown',
          rating: Number(rating),
          review: review || '',
          createdAt: new Date().toISOString(),
        });
        return NextResponse.json({ success: true, data: newRating });
      }

      // ── Check friendship status ──
      case 'check': {
        const { userId1, userId2 } = body;
        const isFriend = areFriends(userId1, userId2);
        const avg = getAverageRating(userId2);
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
