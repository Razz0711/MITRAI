// ============================================
// MitrAI - Attendance API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getAttendanceForUser,
  upsertAttendance,
  upsertBulkAttendance,
  deleteAttendance,
} from '@/lib/store';
import { AttendanceRecord } from '@/lib/types';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

// GET /api/attendance?userId=xxx
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });

    // Ownership: can only view own attendance
    if (userId !== authUser.id) return forbidden();

    const records = await getAttendanceForUser(userId);
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

// POST /api/attendance
// Actions: upsert (create/update), delete
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'upsert') {
      const { id, userId, subject, totalClasses, attendedClasses } = body;
      if (!userId || !subject) {
        return NextResponse.json({ success: false, error: 'Missing userId or subject' }, { status: 400 });
      }
      // Ownership: can only modify own attendance
      if (userId !== authUser.id) return forbidden();

      const record: AttendanceRecord = {
        id: id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        subject: subject.trim(),
        totalClasses: totalClasses || 0,
        attendedClasses: attendedClasses || 0,
        lastUpdated: new Date().toISOString(),
        createdAt: body.createdAt || new Date().toISOString(),
      };

      const result = await upsertAttendance(record);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'bulk-upsert') {
      const { userId, subjects } = body;
      if (!userId || !Array.isArray(subjects) || subjects.length === 0) {
        return NextResponse.json({ success: false, error: 'Missing userId or subjects array' }, { status: 400 });
      }
      if (userId !== authUser.id) return forbidden();
      if (subjects.length > 50) {
        return NextResponse.json({ success: false, error: 'Maximum 50 subjects per batch' }, { status: 400 });
      }

      const records: AttendanceRecord[] = subjects.map((subject: string) => ({
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        subject: subject.trim(),
        totalClasses: 0,
        attendedClasses: 0,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }));

      const results = await upsertBulkAttendance(records);
      return NextResponse.json({ success: true, data: results });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
      // Ownership: verify the record belongs to the current user
      const { getAttendanceRecordById } = await import('@/lib/store');
      const record = await getAttendanceRecordById(id);
      if (!record) return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
      if (record.userId !== authUser.id) return forbidden();
      const deleted = await deleteAttendance(id);
      return NextResponse.json({ success: deleted, error: deleted ? undefined : 'Failed to delete' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process attendance action' }, { status: 500 });
  }
}
