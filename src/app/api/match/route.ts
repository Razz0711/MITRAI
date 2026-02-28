// ============================================
// MitrAI - Matching API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllStudents, getStudentById, getStudentsByMatchKey } from '@/lib/store';
import { findTopMatches } from '@/lib/matching';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`match:${authUser.id}`, 5, 60_000)) return rateLimitExceeded();
  try {
    const { studentId, useAI } = await req.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'studentId is required' }, { status: 400 });
    }

    const student = await getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    // Fetch candidates: if student has a match_key, only fetch batchmates; otherwise fall back to all
    const candidates = student.matchKey
      ? await getStudentsByMatchKey(student.matchKey)
      : await getAllStudents();

    const hasApiKey = !!process.env.GEMINI_API_KEY;
    const shouldUseAI = useAI !== false && hasApiKey;

    const matches = await findTopMatches(student, candidates, 3, shouldUseAI);

    return NextResponse.json({ success: true, data: { student, matches } });
  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json({ success: false, error: 'Failed to find matches' }, { status: 500 });
  }
}
