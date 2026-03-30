// ============================================
// MitrRAI - Circle Messages API
// GET  /api/circles/[id]/messages?before=ISO&limit=30
// POST /api/circles/[id]/messages { text } or FormData with file
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { getCircleMessages, sendCircleMessage } from '@/lib/store/circles';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { id: circleId } = await params;
  const before = req.nextUrl.searchParams.get('before') || undefined;
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 30), 50);

  const messages = await getCircleMessages(circleId, limit, before);
  return NextResponse.json({ success: true, messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (!rateLimit(`circle_msg:${authUser.id}`, 30, 60_000)) return rateLimitExceeded();

  const { id: circleId } = await params;

  const contentType = req.headers.get('content-type') || '';

  // Get sender name
  const { data: student } = await supabase
    .from('students')
    .select('name')
    .eq('id', authUser.id)
    .single();
  let senderName = (student?.name as string) || '';
  
  // Fallback to auth metadata
  if (!senderName) {
    try {
      const { data: authData } = await supabase.auth.admin.getUserById(authUser.id);
      senderName = authData?.user?.user_metadata?.name || 'Student';
    } catch {
      senderName = 'Student';
    }
  }

  // ── File upload (image or document) ──
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const msgType = (formData.get('type') as string) || 'image';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: 'File too large (5MB max)' }, { status: 400 });
      }

      // Validate type
      if (msgType === 'image' && !file.type.startsWith('image/')) {
        return NextResponse.json({ success: false, error: 'Invalid image file' }, { status: 400 });
      }

      // Upload to Supabase Storage
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `${circleId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('circle-attachments')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('circle-attachments')
        .getPublicUrl(filePath);

      const metadata = {
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      };

      const type = msgType === 'document' ? 'document' as const : 'image' as const;
      const msg = await sendCircleMessage(circleId, authUser.id, senderName, file.name, type, metadata);
      if (!msg) return NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 });

      return NextResponse.json({ success: true, message: msg });
    } catch (err) {
      console.error('File upload error:', err);
      return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }
  }

  // ── JSON body (text or poll) ──
  const body = await req.json().catch(() => ({}));

  // Poll creation
  if (body.type === 'poll') {
    const question = (body.question || '').trim();
    const options: string[] = (body.options || []).filter((o: string) => o.trim());

    if (!question || options.length < 2 || options.length > 6) {
      return NextResponse.json({ success: false, error: 'Poll needs a question and 2-6 options' }, { status: 400 });
    }

    const metadata = { question, options };
    const msg = await sendCircleMessage(circleId, authUser.id, senderName, `📊 ${question}`, 'poll', metadata);
    if (!msg) return NextResponse.json({ success: false, error: 'Failed to create poll' }, { status: 500 });

    return NextResponse.json({ success: true, message: msg });
  }

  // Regular text message
  const text = (body.text || '').trim();
  if (!text || text.length > 1000) {
    return NextResponse.json({ success: false, error: 'Invalid message' }, { status: 400 });
  }

  const msg = await sendCircleMessage(circleId, authUser.id, senderName, text);
  if (!msg) return NextResponse.json({ success: false, error: 'Failed to send' }, { status: 500 });

  return NextResponse.json({ success: true, message: msg });
}
