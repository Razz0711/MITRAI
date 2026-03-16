// ============================================
// MitrAI - Arya Chat API (Gemini 1.5 Flash)
// Loads full conversation history (ignores is_deleted_by_user)
// Passes system prompt on every call
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { supabase } from '@/lib/store/core';
import { ARYA_SYSTEM_PROMPT } from '@/lib/arya-prompt';

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    return NextResponse.json({ success: false, error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const body = await req.json();
  const { conversation_id, message } = body;

  if (!conversation_id || !message) {
    return NextResponse.json({ success: false, error: 'conversation_id and message required' }, { status: 400 });
  }

  try {
    // Load full conversation history from Supabase
    // is_deleted_by_user is intentionally IGNORED here.
    // Arya context loader always reads full message history
    // regardless of this flag to maintain conversation continuity
    // and learn user communication patterns.
    const { data: history, error: historyError } = await supabase
      .from('arya_messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (historyError) {
      console.error('History fetch error:', historyError);
    }

    // Convert to Gemini format (Gemini uses 'model' instead of 'assistant')
    // Gemini requires alternating user/model roles — merge consecutive same-role messages
    const rawHistory = (history || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    }));

    // Fix: merge consecutive same-role messages (Gemini rejects them)
    const conversationHistory: typeof rawHistory = [];
    for (const msg of rawHistory) {
      if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === msg.role) {
        // Merge with previous message of same role
        conversationHistory[conversationHistory.length - 1].parts[0].text += '\n' + msg.parts[0].text;
      } else {
        conversationHistory.push({ ...msg });
      }
    }

    // Gemini requires history to start with 'user' role — remove leading 'model' messages
    while (conversationHistory.length > 0 && conversationHistory[0].role === 'model') {
      conversationHistory.shift();
    }

    // Initialize Gemini model with system prompt
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: ARYA_SYSTEM_PROMPT,
    });

    // Start chat with conversation history (exclude the current message — it's sent via sendMessage)
    // The last entry in history may be the user message we just persisted — remove it
    const historyToSend = [...conversationHistory];
    if (historyToSend.length > 0 && historyToSend[historyToSend.length - 1].role === 'user') {
      // Check if the last user message matches the one being sent
      const lastUserMsg = historyToSend[historyToSend.length - 1].parts[0].text;
      if (lastUserMsg.includes(message)) {
        historyToSend.pop();
      }
    }

    const chat = model.startChat({
      history: historyToSend,
    });

    // Send the new user message
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({
      success: true,
      data: { response: responseText },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Gemini chat error:', errMsg);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
