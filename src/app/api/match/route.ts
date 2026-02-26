// ============================================
// MitrAI - Matching API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAllStudents, getStudentById } from '@/lib/store';
import { findTopMatches } from '@/lib/matching';

export async function POST(req: NextRequest) {
  try {
    const { studentId, useAI } = await req.json();

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'studentId is required' }, { status: 400 });
    }

    const student = getStudentById(studentId);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const allStudents = getAllStudents();
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    const shouldUseAI = useAI !== false && hasApiKey;

    const matches = await findTopMatches(student, allStudents, 3, shouldUseAI);

    return NextResponse.json({ success: true, data: { student, matches } });
  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json({ success: false, error: 'Failed to find matches' }, { status: 500 });
  }
}
