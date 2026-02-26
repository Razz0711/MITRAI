// ============================================
// MitrAI - Onboarding Chat API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getOnboardingResponse } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  // Parse body ONCE before try/catch so it's available in the catch block
  let step = 0;
  let message = '';
  let collectedData: Record<string, string> = {};
  let conversationHistory: { role: string; content: string }[] = [];

  try {
    const body = await req.json();
    step = body.step ?? 0;
    message = body.message ?? '';
    collectedData = body.collectedData ?? {};
    conversationHistory = body.conversationHistory ?? [];

    if (!process.env.GEMINI_API_KEY) {
      // Fallback responses when no API key
      const fallbackResponse = getFallbackResponse(step, message, collectedData);
      return NextResponse.json({ success: true, data: { response: fallbackResponse } });
    }

    const response = await getOnboardingResponse(step, message, collectedData, conversationHistory);

    return NextResponse.json({ success: true, data: { response } });
  } catch (error) {
    console.error('Onboarding chat error:', error);

    // Use already-parsed values from above (won't lose them even if Gemini fails)
    const fallback = getFallbackResponse(step, message, collectedData);

    return NextResponse.json({ success: true, data: { response: fallback } });
  }
}

function getFallbackResponse(step: number, _message: string, data: Record<string, string>): string {
  const name = data.name || 'there';

  const responses: Record<number, string> = {
    0: `Hey! Welcome to MitrAI for SVNIT!\nI'm your study buddy matching agent. Let's find you the perfect partner.\nWhat's your name?`,
    1: `Nice to meet you, ${name}!\nWhich department/branch are you in at SVNIT?\n(CSE, AI, Mechanical, Civil, Electrical, Electronics, Chemical, Integrated M.Sc. Mathematics, Integrated M.Sc. Physics, Integrated M.Sc. Chemistry, B.Tech Physics, Mathematics & Computing)`,
    2: `Got it! What year are you in? (1st / 2nd / 3rd / 4th / 5th)`,
    3: `What are you currently studying or preparing for?\n(Semester exams, GATE, placements, projects, etc.)`,
    4: `Which subjects are you strong in?\n(List them separated by commas)`,
    5: `And which subjects do you need help with? That's exactly what a study buddy is for.`,
    6: `How do you prefer to study?\nReading notes / Watching videos / Solving problems / Group discussion\n(Pick one or more)`,
    7: `How long are your study sessions usually?\n30 minutes / 1 hour / 2 hours`,
    8: `Which days and times work best for you?\n(e.g., Mon, Wed, Fri evenings 7-10 PM)`,
    9: `What's your main goal right now, ${name}?\n(e.g., Score 9+ SGPA, GATE prep, complete project, etc.)`,
    10: `Last question! Do you prefer a strict study schedule or flexible one? And do you need someone to keep you accountable?`,
    11: `All set, ${name}! Creating your profile now.\nI'll match you with the best study buddies from SVNIT.\n\nHead to the dashboard to see your matches!`,
  };

  return responses[step] || responses[0];
}
