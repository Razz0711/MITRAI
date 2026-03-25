// MitrRAI - Campus Feed API
// GET: fetch posts — own campus first, then trending from other colleges
// POST: create a new post (auto-tagged with institution)
// POST: create a new post
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { getFeedPosts, createPost } from '@/lib/store/feed';

export const dynamic = 'force-dynamic';

/**
 * Extract root institution code from an email address.
 * e.g. "student@cse.svnit.ac.in" → "svnit"
 *      "abc@iitb.ac.in"          → "iitb"
 */
function extractInstitution(email: string): string {
  const domain = email.split('@')[1] || '';
  const withoutAcIn = domain.replace(/\.ac\.in$/, '');
  const parts = withoutAcIn.split('.');
  return parts[parts.length - 1].toLowerCase();
}

// GET /api/feed?category=&location=&limit=20&offset=0
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const institution = extractInstitution(authUser.email || '');

  try {
    const result = await getFeedPosts({
      category: sp.get('category') || undefined,
      location: sp.get('location') || undefined,
      limit: parseInt(sp.get('limit') || '20'),
      offset: parseInt(sp.get('offset') || '0'),
      userId: authUser.id,
      institution: institution || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Feed GET error:', error);
    return NextResponse.json({ success: false, error: 'kuch gadbad ho gayi, dobara try karo 🙏' }, { status: 500 });
  }
}

// POST /api/feed { content, category, subcategory?, location?, lat?, lng?, isAnonymous? }
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  if (!rateLimit(`feed-post:${authUser.id}`, 10, 60_000)) return rateLimitExceeded();

  const institution = extractInstitution(authUser.email || '');

  try {
    const body = await req.json();
    const { content, category, subcategory, location, lat, lng, isAnonymous } = body;

    if (!content || !category) {
      return NextResponse.json({ success: false, error: 'Content and category required' }, { status: 400 });
    }

    const result = await createPost({
      userId: authUser.id,
      content,
      category,
      subcategory,
      location,
      lat,
      lng,
      isAnonymous,
      institution,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Feed POST error:', error);
    return NextResponse.json({ success: false, error: 'kuch gadbad ho gayi, dobara try karo 🙏' }, { status: 500 });
  }
}
