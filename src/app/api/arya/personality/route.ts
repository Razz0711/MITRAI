// ============================================
// MitrRAI - Self Awareness Test API
// POST: Generate report via Grok  |  GET: Fetch reports
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { supabase } from '@/lib/store/core';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { buildSystemInstruction, buildReportPrompt, OceanScores, getScoreLabel } from '@/lib/personality-test';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for large AI response

// ── GET: Fetch user's reports ──
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'latest';

  try {
    if (action === 'history') {
      // Return all reports (summary only, not full_report blob)
      const { data, error } = await supabase
        .from('personality_reports')
        .select('id, report_number, openness, conscientiousness, extraversion, agreeableness, neuroticism, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    if (action === 'check') {
      // Quick check if user has taken the test + last date
      const { data: student } = await supabase
        .from('students')
        .select('has_taken_personality_test, personality_test_count, last_personality_test_date, latest_personality_report_id')
        .eq('id', user.id)
        .single();

      return NextResponse.json({
        success: true,
        data: {
          hasTaken: student?.has_taken_personality_test || false,
          testCount: student?.personality_test_count || 0,
          lastTestDate: student?.last_personality_test_date || null,
          latestReportId: student?.latest_personality_report_id || null,
        },
      });
    }

    // Default: fetch latest full report
    const reportId = searchParams.get('id');
    let query = supabase
      .from('personality_reports')
      .select('*')
      .eq('user_id', user.id);

    if (reportId) {
      query = query.eq('id', reportId);
    } else {
      query = query.order('created_at', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: true, data: null });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Personality GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch report' }, { status: 500 });
  }
}

// ── POST: Generate new report ──
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Rate limit: 2 per hour
  if (!rateLimit(`personality:${user.id}`, 2, 3600_000)) return rateLimitExceeded();

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'AI service not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { scores, rawAnswers } = body as {
      scores: OceanScores;
      rawAnswers: Record<string, number>;
    };

    if (!scores || !rawAnswers) {
      return NextResponse.json({ success: false, error: 'scores and rawAnswers required' }, { status: 400 });
    }

    // 1. Get user's name
    const { data: studentRow } = await supabase
      .from('students')
      .select('name, personality_test_count, last_personality_test_date')
      .eq('id', user.id)
      .single();

    const userName = studentRow?.name || user.user_metadata?.name || 'Friend';
    const testCount = (studentRow?.personality_test_count || 0) + 1;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // 2. Check for previous report (for retake comparison)
    let previousScores: OceanScores | null = null;
    let previousDate: string | null = null;

    if (testCount > 1) {
      const { data: prevReport } = await supabase
        .from('personality_reports')
        .select('openness, conscientiousness, extraversion, agreeableness, neuroticism, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (prevReport) {
        previousScores = {
          openness: prevReport.openness,
          conscientiousness: prevReport.conscientiousness,
          extraversion: prevReport.extraversion,
          agreeableness: prevReport.agreeableness,
          neuroticism: prevReport.neuroticism,
        };
        const prevD = new Date(prevReport.created_at);
        const daysDiff = Math.floor((now.getTime() - prevD.getTime()) / 86400000);
        previousDate = `${daysDiff} days ago`;
      }
    }

    // 3. Build the prompt
    const systemInstruction = buildSystemInstruction();
    const userPrompt = buildReportPrompt(userName, dateStr, scores, previousScores, previousDate);

    // 4. Call Grok API
    const xai = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });

    const callGrok = async (attempt: number): Promise<Record<string, unknown>> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout

      try {
        const completion = await xai.chat.completions.create(
          {
            model: 'grok-4-1-fast-non-reasoning',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 8192,
            temperature: 0.7,
          },
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        const raw = (completion.choices[0]?.message?.content || '')
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        return JSON.parse(raw);
      } catch (err) {
        clearTimeout(timeout);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 2000));
          return callGrok(attempt + 1);
        }
        throw err;
      }
    };

    const reportData = await callGrok(1);

    // 5. Extract arya_context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aryaContext = (reportData as any).arya_context || {};

    // 6. Save to Supabase
    const { data: savedReport, error: insertError } = await supabase
      .from('personality_reports')
      .insert({
        user_id: user.id,
        report_number: testCount,
        openness: scores.openness,
        conscientiousness: scores.conscientiousness,
        extraversion: scores.extraversion,
        agreeableness: scores.agreeableness,
        neuroticism: scores.neuroticism,
        raw_answers: rawAnswers,
        full_report: reportData,
        arya_context: aryaContext,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // 7. Update students table
    await supabase
      .from('students')
      .update({
        has_taken_personality_test: true,
        latest_personality_report_id: savedReport.id,
        personality_test_count: testCount,
        last_personality_test_date: now.toISOString(),
      })
      .eq('id', user.id);

    // 8. Return full report
    return NextResponse.json({
      success: true,
      data: {
        reportId: savedReport.id,
        reportNumber: testCount,
        scores: {
          openness: { score: scores.openness, label: getScoreLabel(scores.openness) },
          conscientiousness: { score: scores.conscientiousness, label: getScoreLabel(scores.conscientiousness) },
          extraversion: { score: scores.extraversion, label: getScoreLabel(scores.extraversion) },
          agreeableness: { score: scores.agreeableness, label: getScoreLabel(scores.agreeableness) },
          neuroticism: { score: scores.neuroticism, label: getScoreLabel(scores.neuroticism) },
        },
        report: reportData,
      },
    });
  } catch (err) {
    console.error('Personality POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report. Please try again.' },
      { status: 500 }
    );
  }
}
