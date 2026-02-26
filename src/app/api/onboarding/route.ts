// ============================================
// MitrAI - Onboarding Chat API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getOnboardingResponse } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { step, message, collectedData, conversationHistory } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      // Fallback responses when no API key
      const fallbackResponses = getFallbackResponse(step, message, collectedData);
      return NextResponse.json({ success: true, data: { response: fallbackResponses } });
    }

    const response = await getOnboardingResponse(step, message, collectedData, conversationHistory || []);

    return NextResponse.json({ success: true, data: { response } });
  } catch (error) {
    console.error('Onboarding chat error:', error);

    // Fallback to template response on error
    const { step, message, collectedData } = await req.json().catch(() => ({ step: 0, message: '', collectedData: {} }));
    const fallback = getFallbackResponse(step, message, collectedData);

    return NextResponse.json({ success: true, data: { response: fallback } });
  }
}

function getFallbackResponse(step: number, _message: string, data: Record<string, string>): string {
  const name = data.name || 'there';

  const responses: Record<number, string> = {
    0: `Hey! Welcome to MitrAI 👋\nI'm your personal study agent. I'll help you find your perfect study buddy!\nLet's start - what's your name?`,
    1: `Nice to meet you, ${name}! 🎉\nHow old are you?`,
    2: `Great! Which city and country are you from? 🌍`,
    3: `Awesome! Which language do you prefer for studying?\nOptions: English, Hindi, Tamil, Telugu, Bengali, Marathi, or Other`,
    4: `Perfect! What are you currently studying? 📚\n(e.g., Class 12 Science, B.Tech, preparing for competitive exams)`,
    5: `Nice! Which exam are you targeting? 🎯\nJEE / NEET / UPSC / CAT / GRE / GATE / Board Exams / Other`,
    6: `Got it! What year or level are you in?`,
    7: `Great ${name}! 💪 Which subjects are you strong in?\n(You can list multiple, separated by commas)`,
    8: `And which subjects do you need improvement in? Don't worry, that's what study buddies are for! 😊`,
    9: `How do you prefer to study?\n📖 Reading notes\n🎥 Watching videos\n✏️ Solving problems\n💬 Group discussion\n(Pick one or more!)`,
    10: `How long are your study sessions usually?\n⏱️ 30 minutes / 1 hour / 2 hours / More`,
    11: `Which days and times work best for you? 📅\n(e.g., Mon, Wed, Fri evenings 7-10 PM)`,
    12: `What's your main study goal right now? 🎯\n(e.g., Complete calculus by month end, score 95+ in boards)`,
    13: `Last couple of questions, ${name}! Do you prefer strict scheduled sessions or flexible ones? And do you need an accountability partner? 🤝`,
    14: `Perfect! I have everything I need, ${name}! 🎉\nCreating your personal study agent now... I'll find you the best study buddy soon! 🎯\n\nYour profile is being set up. Head to the dashboard to see your matches!`,
  };

  return responses[step] || responses[0];
}
