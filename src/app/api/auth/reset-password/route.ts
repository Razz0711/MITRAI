// ============================================
// MitrAI - Password Reset API
// Uses Supabase Auth's built-in password reset flow
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, password } = body;

    // ── Request password reset email ──
    if (action === 'request') {
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
      }

      // Rate limit: 3 requests per 10 minutes per email
      if (!rateLimit(`reset:${email}`, 3, 600_000)) return rateLimitExceeded();

      const svnitRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?svnit\.ac\.in$/;
      if (!svnitRegex.test(email)) {
        return NextResponse.json({ success: false, error: 'Only SVNIT emails allowed' }, { status: 400 });
      }

      // Use Supabase's built-in password reset
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mitrai-study.vercel.app';
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${siteUrl}/reset-password`,
      });

      if (error) {
        console.error('[ResetPassword] Error:', error.message);
        // Don't reveal if email exists or not
      }

      // Always return success to not reveal email existence
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists, a reset link has been sent.',
      });
    }

    // ── Update password with token ──
    if (action === 'update') {
      if (!password || password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      // Password update is handled client-side via Supabase SDK after redirect
      return NextResponse.json({
        success: true,
        message: 'Use the client-side Supabase SDK to update password after redirect.',
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
