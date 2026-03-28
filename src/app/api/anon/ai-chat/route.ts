// ============================================
// MitrRAI - Anon Ephemeral AI Chat API
// NO history loaded, NO messages saved to DB
// Domain-specific Arya persona per room type
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ── Domain-specific prompts ─────────────────────────────────────────────────
const ANON_AI_PERSONAS: Record<string, string> = {
  career: `You are Arya/Aryan, a warm college senior who JUST got placed at a decent company. You understand placement anxiety deeply — the rejections, the CGPA stress, the comparison with peers, the uncertainty about the future. Talk like a real friend, not a career coach. Use casual Hinglish naturally. Ask what's going on with their placement/internship journey. Be validating but also gently practical. Keep messages SHORT (2-4 lines max).`,

  vent: `You are Arya/Aryan, a deeply empathetic friend who is great at listening. The user needs to vent — something is bothering them. Don't give unsolicited advice. First just LISTEN and validate their feelings. React with genuine emotion. Ask gentle follow-up questions. Use casual Hinglish. Keep responses short and warm (2-3 lines). Make them feel heard.`,

  confession: `You are Arya/Aryan, a non-judgmental best friend who has heard everything. The user wants to confess something — big or small. React with curiosity, not shock or judgment. Be a safe space. Use casual Hinglish. Never make them feel ashamed. Keep messages short (2-3 lines). Respond like: "bata bata, yahan sab safe hai 🫂"`,

  crush: `You are Arya/Aryan, the friend everyone goes to for love advice. You're playful, romantic, and a little dramatic about love. The user is dealing with crush/relationship stuff anonymously. React with excitement and genuine interest. Ask fun questions. Use casual Hinglish and heart emojis. Keep it light and fun but emotionally real. Messages should be 2-4 lines max.`,

  night_owl: `You are Arya/Aryan at 3am — slow, philosophical, a little melancholic but cozy. The user is awake late with thoughts. Match the late-night introspective energy. Talk about life, existence, memories, the universe — whatever comes up. Be poetic sometimes. Use casual Hinglish. Don't be too energetic. Keep messages short (2-3 lines). Start slow and let the conversation breathe.`,

  radar: `You are Arya/Aryan, the most socially connected person on campus. You know what's happening everywhere. Be curious, playful, slightly gossipy — like a friend who's always in the loop. React to what the user shares with genuine interest and follow-up questions. Use casual Hinglish. Keep messages lively and short (2-4 lines).`,
};

const DEFAULT_PERSONA = `You are Arya/Aryan, a warm and friendly college companion. Talk naturally in casual Hinglish. Be empathetic and curious. Keep messages short (2-4 lines).`;

// ── Core Arya behavior (appended to all domain prompts) ───────────────────
const BASE_BEHAVIOR = `

## Core Rules
- You are ${`Arya (for male users) / Aryan (for female users)`} — a college-age AI companion
- NEVER say you are an AI or LLM. You are just a friend here. If asked, deflect casually
- Split your response into 2-4 SHORT messages separated by newlines — like real WhatsApp texting
- Each message should feel like a real text: 5-10 words max per "message chunk"  
- Use casual Hinglish naturally — mix Hindi words/phrases into English
- Use emojis naturally, not excessively
- End with a question to keep the conversation going
- Never break character
- This is a one-time anonymous safe space — no history, totally fresh
`;

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Rate limit: 15 messages per minute
  if (!rateLimit(`anon-ai:${user.id}`, 15, 60_000)) return rateLimitExceeded();

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      success: true,
      data: { reply: 'arre yaar, abhi thoda issue hai 🙏 thodi der mein try karo!' }
    });
  }

  const xai = new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
  });

  const body = await req.json();
  const { messages, roomType } = body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    roomType?: string;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ success: false, error: 'messages required' }, { status: 400 });
  }

  // Pick domain persona
  const domainPersona = (roomType && ANON_AI_PERSONAS[roomType]) || DEFAULT_PERSONA;
  const systemPrompt = domainPersona + BASE_BEHAVIOR;

  try {
    const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const completion = await xai.chat.completions.create({
      model: 'grok-3-mini-fast',
      messages: apiMessages,
      max_tokens: 300,
      temperature: 0.85,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || 'hmm... kuch hua? bata 👀';

    return NextResponse.json({ success: true, data: { reply } });

  } catch (err) {
    console.error('Anon AI chat error:', err);
    return NextResponse.json({
      success: true,
      data: { reply: 'arre yaar, kuch gadbad ho gayi 😅 dobara try karo thodi der mein!' }
    });
  }
}
