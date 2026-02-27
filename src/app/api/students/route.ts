// ============================================
// MitrAI - Student Profile API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllStudents, createStudent, getStudentById, deleteStudent, updateStudent } from '@/lib/store';
import { StudentProfile } from '@/lib/types';
import { getAuthUser, unauthorized, forbidden } from '@/lib/api-auth';

// Strip sensitive fields when viewing other users' profiles
function stripSensitive(student: StudentProfile): Partial<StudentProfile> {
  const { email, admissionNumber, ...safe } = student;
  return safe;
}

// GET - Fetch all students or a specific student
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const student = await getStudentById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }
    // Return full data for own profile, stripped for others
    const data = id === authUser.id ? student : stripSensitive(student);
    return NextResponse.json({ success: true, data });
  }

  const students = await getAllStudents();
  const data = students.map(s => s.id === authUser.id ? s : stripSensitive(s));
  return NextResponse.json({ success: true, data });
}

// POST - Create a new student profile
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await req.json();

    // If client sends an ID, check if it already exists — if so, return it
    // (this happens when signup auto-creates a profile)
    if (body.id) {
      const existing = await getStudentById(body.id);
      if (existing) {
        return NextResponse.json({ success: true, data: existing }, { status: 200 });
      }
    }

    // Check for duplicate: same email + same targetExam = already exists
    // Skip this check for auto-created profiles (they have no targetExam yet)
    if (!body._autoCreated) {
      const allStudents = await getAllStudents();
      const duplicate = allStudents.find(
        s => s.email && body.email &&
          s.email.toLowerCase() === body.email.toLowerCase() &&
          s.targetExam && body.targetExam &&
          s.targetExam.toLowerCase() === body.targetExam.toLowerCase()
      );
      if (duplicate) {
        return NextResponse.json({
          success: false,
          error: `You already have a profile for "${body.targetExam}". Each exam can only have one profile.`,
        }, { status: 409 });
      }
    }

    const student: StudentProfile = {
      id: body.id || uuidv4(),
      createdAt: new Date().toISOString(),
      name: String(body.name || 'Unknown').slice(0, 100),
      age: Math.min(Math.max(Number(body.age) || 17, 10), 100),
      email: String(body.email || '').slice(0, 200),
      admissionNumber: body.admissionNumber || '',
      city: body.city || '',
      country: body.country || 'India',
      timezone: body.timezone || 'IST',
      preferredLanguage: body.preferredLanguage || 'English',
      currentStudy: body.currentStudy || '',
      institution: body.institution || 'SVNIT Surat',
      department: body.department || '',
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

    const created = await createStudent(student);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create student' }, { status: 500 });
  }
}

// PUT - Update an existing student profile (used by onboarding to fill in details)
export async function PUT(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 });
    }

    // Ownership check: can only update own profile
    if (id !== authUser.id) return forbidden();

    const existing = await getStudentById(id);
    if (!existing) {
      // If not found, create it instead
      const student: StudentProfile = {
        id,
        createdAt: new Date().toISOString(),
        name: updates.name || 'Unknown',
        age: updates.age || 17,
        email: updates.email || '',
        admissionNumber: updates.admissionNumber || '',
        city: updates.city || 'Surat',
        country: updates.country || 'India',
        timezone: updates.timezone || 'IST',
        preferredLanguage: updates.preferredLanguage || 'English',
        currentStudy: updates.currentStudy || '',
        institution: updates.institution || 'SVNIT Surat',
        department: updates.department || '',
        yearLevel: updates.yearLevel || '',
        targetExam: updates.targetExam || '',
        targetDate: updates.targetDate || '',
        strongSubjects: updates.strongSubjects || [],
        weakSubjects: updates.weakSubjects || [],
        currentlyStudying: updates.currentlyStudying || '',
        upcomingTopics: updates.upcomingTopics || [],
        learningType: updates.learningType || 'practical',
        studyMethod: updates.studyMethod || ['problems'],
        sessionLength: updates.sessionLength || '1hr',
        breakPattern: updates.breakPattern || 'flexible',
        pace: updates.pace || 'medium',
        availableDays: updates.availableDays || ['Monday', 'Wednesday', 'Friday'],
        availableTimes: updates.availableTimes || '7PM-10PM IST',
        sessionsPerWeek: updates.sessionsPerWeek || 3,
        sessionType: updates.sessionType || 'both',
        studyStyle: updates.studyStyle || 'flexible',
        communication: updates.communication || 'extrovert',
        teachingAbility: updates.teachingAbility || 'average',
        accountabilityNeed: updates.accountabilityNeed || 'medium',
        videoCallComfort: updates.videoCallComfort ?? true,
        shortTermGoal: updates.shortTermGoal || '',
        longTermGoal: updates.longTermGoal || '',
        studyHoursTarget: updates.studyHoursTarget || 4,
        weeklyGoals: updates.weeklyGoals || '',
      };
      const created = await createStudent(student);
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    const updated = await updateStudent(id, updates);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update student' }, { status: 500 });
  }
}

// DELETE - Delete a student profile (ownership verified)
export async function DELETE(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 });
    }

    // Ownership check: only the profile owner can delete
    if (id !== authUser.id) return forbidden();

    const student = await getStudentById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const deleted = await deleteStudent(id);
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Profile deleted successfully' });
    }

    return NextResponse.json({ success: false, error: 'Failed to delete profile' }, { status: 500 });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete profile' }, { status: 500 });
  }
}