// ============================================
// MitrRAI - Experts API
// GET: List experts | POST: Admin create expert
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { verifyAdminAccess } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// GET /api/experts?search=&filter=&featured=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || '';
    const featured = searchParams.get('featured') === 'true';

    const isAll = searchParams.get('all') === 'true';
    const adminKey = searchParams.get('adminKey');

    let query = supabase
      .from('experts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('rating', { ascending: false });

    // Restrict if not admin requesting all
    let isAdmin = false;
    if (adminKey) {
      isAdmin = await verifyAdminAccess(adminKey);
    }
    
    if (!isAll || !isAdmin) {
      query = query.eq('is_active', true);
    }

    if (featured) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase raw error in API:', error);
      return NextResponse.json({ success: false, error: error.message || JSON.stringify(error) }, { status: 500 });
    }

    // Client-side filtering for search/expertise (Supabase jsonb filtering is limited)
    let results = data || [];

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        (e.expertise as string[])?.some((x: string) => x.toLowerCase().includes(q)) ||
        (e.languages as string[])?.some((l: string) => l.toLowerCase().includes(q))
      );
    }

    if (filter && filter !== 'all') {
      results = results.filter(e =>
        (e.expertise as string[])?.some((x: string) => x.toLowerCase().includes(filter.toLowerCase()))
      );
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error('Experts GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch experts' }, { status: 500 });
  }
}

// POST /api/experts — Admin only
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const adminKey = req.nextUrl.searchParams.get('adminKey');
  if (!await verifyAdminAccess(adminKey)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name, title, gender, about, avatar_url,
      experience_years, qualifications, languages,
      expertise, specializations, awards, work_experience,
      price_per_session, session_duration_mins, booking_url,
      is_featured, sort_order,
    } = body;

    if (!name || !title) {
      return NextResponse.json({ success: false, error: 'name and title required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('experts')
      .insert({
        name,
        title: title || 'Counselling Psychologist',
        gender: gender || 'female',
        about: about || '',
        avatar_url: avatar_url || null,
        experience_years: experience_years || 1,
        qualifications: qualifications || [],
        languages: languages || ['English', 'Hindi'],
        expertise: expertise || [],
        specializations: specializations || [],
        awards: awards || [],
        work_experience: work_experience || [],
        price_per_session: price_per_session || 0,
        session_duration_mins: session_duration_mins || 45,
        booking_url: booking_url || null,
        is_featured: is_featured || false,
        sort_order: sort_order || 0,
      })
      .select('id, name')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Expert POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create expert' }, { status: 500 });
  }
}
