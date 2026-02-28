// ============================================
// MitrAI - Admin Auth API
// POST: Login with email/password, sets session cookie
// GET: Verify current session
// DELETE: Logout (clear cookie)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, generateAdminToken, verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// POST /api/admin/auth — Login
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
    }

    if (!validateAdminCredentials(email, password)) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateAdminToken();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Admin not configured' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, message: 'Authenticated' });

    // Set HTTP-only secure cookie (7 days)
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[Admin Auth] POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// GET /api/admin/auth — Verify session
export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
    if (!cookie?.value) {
      return NextResponse.json({ success: false, authenticated: false });
    }

    const valid = verifyAdminToken(cookie.value);
    return NextResponse.json({ success: true, authenticated: valid });
  } catch {
    return NextResponse.json({ success: false, authenticated: false });
  }
}

// DELETE /api/admin/auth — Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });

  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
