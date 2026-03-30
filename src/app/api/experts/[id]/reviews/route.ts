// ============================================
// MitrRAI - Expert Reviews API
// GET: List reviews | POST: Submit review
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/experts/[id]/reviews
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { data, error } = await supabase
      .from('expert_reviews')
      .select(`
        id, rating, review_text, created_at,
        user_id
      `)
      .eq('expert_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Fetch user names for reviews
    const userIds = [...new Set((data || []).map(r => r.user_id))];
    const { data: students } = await supabase
      .from('students')
      .select('id, name')
      .in('id', userIds);

    const nameMap: Record<string, string> = {};
    (students || []).forEach(s => { nameMap[s.id] = s.name || 'Anonymous'; });

    const reviews = (data || []).map(r => ({
      id: r.id,
      rating: r.rating,
      text: r.review_text,
      userName: nameMap[r.user_id]?.split(' ')[0] || 'Anonymous',
      createdAt: r.created_at,
    }));

    return NextResponse.json({ success: true, data: reviews });
  } catch (err) {
    console.error('Reviews GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/experts/[id]/reviews
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!rateLimit(`review:${user.id}`, 5, 3600_000)) return rateLimitExceeded();

  try {
    const { rating, text } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Check if expert exists
    const { data: expert } = await supabase
      .from('experts')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    // Upsert (update if exists, insert if not)
    const { data, error } = await supabase
      .from('expert_reviews')
      .upsert(
        {
          expert_id: id,
          user_id: user.id,
          rating,
          review_text: text || null,
        },
        { onConflict: 'expert_id,user_id' }
      )
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Review POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to submit review' }, { status: 500 });
  }
}
