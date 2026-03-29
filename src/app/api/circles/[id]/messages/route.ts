// ============================================
// MitrRAI - Circle Messages API
// GET  /api/circles/[id]/messages?before=ISO&limit=30
// POST /api/circles/[id]/messages { text }
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { getCircleMessages, sendCircleMessage } from '@/lib/store/circles';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const before = req.nextUrl.searchParams.get('before') || undefined;
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 30), 50);

  const messages = await getCircleMessages(params.id, limit, before);
  return NextResponse.json({ success: true, messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`circle_msg:${authUser.id}`, 30, 60_000)) return rateLimitExceeded();

  const body = await req.json().catch(() => ({}));
  const text = (body.text || '').trim();
  if (!text || text.length > 1000) {
    return NextResponse.json({ success: false, error: 'Invalid message' }, { status: 400 });
  }

  // Get sender name from students table
  const { data: student } = await supabase
    .from('students')
    .select('name')
    .eq('id', authUser.id)
    .single();
  const senderName = (student?.name as string) || 'Student';

  const msg = await sendCircleMessage(params.id, authUser.id, senderName, text);
  if (!msg) return NextResponse.json({ success: false, error: 'Failed to send' }, { status: 500 });

  return NextResponse.json({ success: true, message: msg });
}
