// ============================================
// MitrAI - Student Profile API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllStudents, createStudent, getStudentById } from '@/lib/store';
import { StudentProfile } from '@/lib/types';

// GET - Fetch all students or a specific student
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const student = getStudentById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: student });
  }

  const students = getAllStudents();
  return NextResponse.json({ success: true, data: students });
}

// POST - Create a new student profile
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const student: StudentProfile = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      name: body.name || 'Unknown',
      age: body.age || 17,
      city: body.city || '',
      country: body.country || 'India',
      timezone: body.timezone || 'IST',
      preferredLanguage: body.preferredLanguage || 'English',
      currentStudy: body.currentStudy || '',
      institution: body.institution || '',
      yearLevel: body.yearLevel || '',
      targetExam: body.targetExam || '',
      targetDate: body.targetDate || '',
      strongSubjects: body.strongSubjects || [],
      weakSubjects: body.weakSubjects || [],
      currentlyStudying: body.currentlyStudying || '',
      upcomingTopics: body.upcomingTopics || [],
      learningType: body.learningType || 'practical',
      studyMethod: body.studyMethod || ['problems'],
      sessionLength: body.sessionLength || '1hr',
      breakPattern: body.breakPattern || 'flexible',
      pace: body.pace || 'medium',
      availableDays: body.availableDays || ['Monday', 'Wednesday', 'Friday'],
      availableTimes: body.availableTimes || '7PM-10PM IST',
      sessionsPerWeek: body.sessionsPerWeek || 3,
      sessionType: body.sessionType || 'both',
      studyStyle: body.studyStyle || 'flexible',
      communication: body.communication || 'extrovert',
      teachingAbility: body.teachingAbility || 'average',
      accountabilityNeed: body.accountabilityNeed || 'medium',
      videoCallComfort: body.videoCallComfort ?? true,
      shortTermGoal: body.shortTermGoal || '',
      longTermGoal: body.longTermGoal || '',
      studyHoursTarget: body.studyHoursTarget || 4,
      weeklyGoals: body.weeklyGoals || '',
    };

    const created = createStudent(student);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create student' }, { status: 500 });
  }
}
