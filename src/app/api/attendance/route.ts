// ============================================
// MitrAI - Attendance API
// GET: list | POST: create/bulk-create | PUT: update | DELETE: delete
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getAttendanceForUser,
  upsertAttendance,
  upsertBulkAttendance,
  deleteAttendance,
  getAttendanceRecordById,
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

// POST /api/attendance — create new record(s)
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await req.json();
    const { userId, subject, subjects } = body;

    // Bulk create
    if (Array.isArray(subjects)) {
      if (!userId || subjects.length === 0) {
        return NextResponse.json({ success: false, error: 'Missing userId or subjects array' }, { status: 400 });
      }
      if (userId !== authUser.id) return forbidden();
      if (subjects.length > 50) {
        return NextResponse.json({ success: false, error: 'Maximum 50 subjects per batch' }, { status: 400 });
      }
      const records: AttendanceRecord[] = subjects.map((s: string) => ({
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId, subject: s.trim(), totalClasses: 0, attendedClasses: 0,
        lastUpdated: new Date().toISOString(), createdAt: new Date().toISOString(),
      }));
      const results = await upsertBulkAttendance(records);
      return NextResponse.json({ success: true, data: results });
    }

    // Single create
    if (!userId || !subject) {
      return NextResponse.json({ success: false, error: 'Missing userId or subject' }, { status: 400 });
    }
    if (userId !== authUser.id) return forbidden();
    const record: AttendanceRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId, subject: subject.trim(), totalClasses: 0, attendedClasses: 0,
      lastUpdated: new Date().toISOString(), createdAt: new Date().toISOString(),
    };
    const result = await upsertAttendance(record);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create attendance' }, { status: 500 });
  }
}

// PUT /api/attendance — update an existing record
export async function PUT(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await req.json();
    const { id, userId, subject, totalClasses, attendedClasses, createdAt } = body;
    if (!id || !userId || !subject) {
      return NextResponse.json({ success: false, error: 'Missing id, userId or subject' }, { status: 400 });
    }
    if (userId !== authUser.id) return forbidden();
    const record: AttendanceRecord = {
      id, userId, subject: subject.trim(),
      totalClasses: totalClasses || 0, attendedClasses: attendedClasses || 0,
      lastUpdated: new Date().toISOString(), createdAt: createdAt || new Date().toISOString(),
    };
    const result = await upsertAttendance(record);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Attendance PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update attendance' }, { status: 500 });
  }
}

// DELETE /api/attendance — delete a record
export async function DELETE(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const record = await getAttendanceRecordById(id);
    if (!record) return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    if (record.userId !== authUser.id) return forbidden();
    const deleted = await deleteAttendance(id);
    return NextResponse.json({ success: deleted, error: deleted ? undefined : 'Failed to delete' });
  } catch (error) {
    console.error('Attendance DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete attendance' }, { status: 500 });
  }
}
