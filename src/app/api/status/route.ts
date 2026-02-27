// ============================================
// MitrAI - Online Status API
// GET: get status for user(s)
// POST: update own status (heartbeat)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserStatus, getAllUserStatuses, updateUserStatus } from '@/lib/store';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

// GET /api/status?userId=xxx or GET /api/status (all)
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const status = await getUserStatus(userId);
      if (!status) {
        return NextResponse.json({
          success: true,
          data: {
            userId,
            status: 'offline',
            lastSeen: new Date().toISOString(),
            hideStatus: false,
            hideSubject: false,
          }
        });
      }

      // Auto-detect offline: if last heartbeat > 5 minutes ago
      const lastSeen = new Date(status.lastSeen).getTime();
      const now = Date.now();
      if (now - lastSeen > 5 * 60 * 1000 && status.status !== 'offline') {
        status.status = 'offline';
        await updateUserStatus(userId, { status: 'offline' });
      }

      // Apply privacy: if hideStatus, show as offline
      if (status.hideStatus) {
        return NextResponse.json({
          success: true,
          data: { ...status, status: 'offline', currentSubject: undefined }
        });
      }

      // Apply privacy: if hideSubject, remove subject
      if (status.hideSubject) {
        return NextResponse.json({
          success: true,
          data: { ...status, currentSubject: undefined }
        });
      }

      return NextResponse.json({ success: true, data: status });
    }

    // Return all statuses (for match cards)
    const allStatuses = await getAllUserStatuses();
    const now = Date.now();

    // Auto-detect offline for all
    const processed = allStatuses.map(s => {
      const lastSeen = new Date(s.lastSeen).getTime();
      if (now - lastSeen > 5 * 60 * 1000 && s.status !== 'offline') {
        s.status = 'offline';
      }
      // Apply privacy
      if (s.hideStatus) {
        return { ...s, status: 'offline' as const, currentSubject: undefined };
      }
      if (s.hideSubject) {
        return { ...s, currentSubject: undefined };
      }
      return s;
    });

    return NextResponse.json({ success: true, data: processed });
  } catch (error) {
    console.error('Status GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch status' }, { status: 500 });
  }
}

// POST /api/status — update own status (heartbeat / manual update)
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await request.json();
    const { userId, status, currentSubject, hideStatus, hideSubject } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    // Ownership: can only update own status
    if (userId !== authUser.id) return forbidden();

    const updates: Record<string, unknown> = {
      lastSeen: new Date().toISOString(),
    };

    if (status !== undefined) updates.status = status;
    if (currentSubject !== undefined) updates.currentSubject = currentSubject;
    if (hideStatus !== undefined) updates.hideStatus = hideStatus;
    if (hideSubject !== undefined) updates.hideSubject = hideSubject;

    if (status === 'in-session') {
      updates.sessionStartedAt = new Date().toISOString();
    }

    const updated = await updateUserStatus(userId, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Status POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update status' }, { status: 500 });
  }
}
