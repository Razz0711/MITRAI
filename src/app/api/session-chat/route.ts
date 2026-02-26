// ============================================
// MitrAI - In-Session Chat API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getStudentById } from '@/lib/store';
import { getSessionAssistantResponse } from '@/lib/gemini';
import { StudentProfile } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { student1Id, student2Id, topic, goal, message, chatHistory } = await req.json();

    if (!message) {
      return NextResponse.json({ success: false, error: 'message is required' }, { status: 400 });
    }

    const student1 = student1Id ? getStudentById(student1Id) : null;
    const student2 = student2Id ? getStudentById(student2Id) : null;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: true,
        data: {
          response: `Great question! Let me help you think through this. 🤔\n\nRegarding "${topic || 'your topic'}": Try breaking it down into smaller parts. What specific concept are you stuck on? I can explain it step by step!\n\n💡 Tip: Try explaining the concept to each other - teaching is the best way to learn!`
        }
      });
    }

    const defaultProfile: StudentProfile = {
      name: 'Student',
      strongSubjects: [],
      weakSubjects: [],
      learningType: 'practical',
      studyMethod: ['problems'],
      currentStudy: '',
      targetExam: '',
      targetDate: '',
      currentlyStudying: topic || '',
      upcomingTopics: [],
      sessionLength: '1hr',
      breakPattern: 'flexible',
      pace: 'medium',
      availableDays: [],
      availableTimes: '',
      sessionsPerWeek: 3,
      sessionType: 'both',
      studyStyle: 'flexible',
      communication: 'extrovert',
      teachingAbility: 'average',
      accountabilityNeed: 'medium',
      videoCallComfort: true,
      shortTermGoal: '',
      longTermGoal: '',
      studyHoursTarget: 4,
      weeklyGoals: '',
      id: '',
      createdAt: '',
      age: 17,
      city: '',
      country: '',
      timezone: 'IST',
      preferredLanguage: 'English',
      institution: '',
      yearLevel: '',
    };

    const s1: StudentProfile = student1 || { ...defaultProfile, name: 'Student 1' };
    const s2: StudentProfile = student2 || { ...defaultProfile, name: 'Student 2' };

    const response = await getSessionAssistantResponse(
      s1, s2,
      topic || 'General Study',
      goal || 'Learn and practice together',
      message,
      chatHistory || []
    );

    return NextResponse.json({ success: true, data: { response } });
  } catch (error) {
    console.error('Session chat error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get response' }, { status: 500 });
  }
}
