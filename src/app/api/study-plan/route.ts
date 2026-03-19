// ============================================
// MitrRAI - Study Plan API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getStudentById } from '@/lib/store';
import { generateStudyPlan } from '@/lib/grok';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`studyplan:${authUser.id}`, 5, 60_000)) return rateLimitExceeded();
  try {
    const { studentId, buddyId, weekDates } = await req.json();

    if (!studentId || !buddyId) {
      return NextResponse.json({ success: false, error: 'studentId and buddyId required' }, { status: 400 });
    }

    const student = await getStudentById(studentId);
    const buddy = await getStudentById(buddyId);

    if (!student || !buddy) {
      return NextResponse.json({ success: false, error: 'Student or buddy not found' }, { status: 404 });
    }

    if (!process.env.GROK_API_KEY) {
      // Fallback study plan
      const fallbackPlan = generateFallbackPlan(student.name, buddy.name, weekDates || 'This Week');
      return NextResponse.json({ success: true, data: { plan: fallbackPlan } });
    }

    const plan = await generateStudyPlan(student, buddy, weekDates || 'This Week');
    return NextResponse.json({ success: true, data: { plan } });
  } catch (error) {
    console.error('Study plan error:', error);
    return NextResponse.json({ success: false, error: 'study plan banana abhi thoda mushkil hai, thodi der mein try karo 🙏' }, { status: 500 });
  }
}

function generateFallbackPlan(studentName: string, buddyName: string, weekDates: string): string {
  return `📚 WEEKLY STUDY PLAN
━━━━━━━━━━━━━━━━━━━━

Student: ${studentName}
Study Buddy: ${buddyName}
Week: ${weekDates}

🎯 Main Goal: Cover key topics and build strong foundations

━━━━━━━━━━━━━━━━━━━━

📅 MONDAY
Solo Session (2 hours):
→ Review previous concepts
→ Read chapter notes
→ Make summary sheets

📅 WEDNESDAY  
Buddy Session (1.5 hours):
→ Discuss difficult concepts
→ Solve problems together
→ Quiz each other

📅 FRIDAY
Solo Session (2 hours):
→ Practice problems
→ Attempt mock questions
→ Review weak areas

📅 SATURDAY
Buddy Session (2 hours):
→ Mock test together
→ Discuss solutions
→ Plan next week

━━━━━━━━━━━━━━━━━━━━

📊 WEEK TARGETS:
✅ Complete 2-3 chapters
✅ Solve 50+ practice problems
✅ 1 mock test
✅ Daily 30-min revision

💪 You've got this, ${studentName}! Study smart with ${buddyName}!`;
}
