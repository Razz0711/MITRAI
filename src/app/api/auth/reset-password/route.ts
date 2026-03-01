// ============================================
// MitrAI - Password Reset API (OTP-based)
// Uses our own SMTP (same as login OTP emails) instead of Supabase's limited built-in mailer
// Flow: send OTP → verify OTP → admin updates password
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: (process.env.SMTP_EMAIL || '').trim(),
    pass: (process.env.SMTP_APP_PASSWORD || '').trim(),
  },
});

async function sendResetOtpEmail(to: string, code: string) {
  const fromEmail = (process.env.SMTP_EMAIL || '').trim();
  await transporter.sendMail({
    from: `"MitrAI" <${fromEmail}>`,
    to,
    subject: `${code} — MitrAI Password Reset Code`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden;">
        <div style="background: #1a1a2e; padding: 28px 24px 12px; text-align: center;">
          <img src="https://mitrai-study.vercel.app/logo.jpg" alt="MitrAI" width="120" style="display: block; margin: 0 auto; height: auto; border-radius: 14px;" />
        </div>
        <div style="background: linear-gradient(180deg, #1a1a2e 0%, #7c3aed 80%, #a855f7 100%); padding: 8px 24px 24px; text-align: center;">
          <h1 style="color: white; font-size: 22px; margin: 0;">Password Reset</h1>
          <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 4px 0 0;">MitrAI — Your SVNIT Study Buddy</p>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <p style="color: #e0e0e0; font-size: 15px; margin: 0 0 8px;">Your password reset code is:</p>
          <div style="background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 12px; padding: 20px; margin: 16px 0;">
            <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #a855f7;">${code}</span>
          </div>
          <p style="color: #888; font-size: 13px; margin: 16px 0 0;">This code expires in <strong style="color: #e0e0e0;">5 minutes</strong>.</p>
          <p style="color: #666; font-size: 12px; margin: 8px 0 0;">If you didn&apos;t request this, you can safely ignore this email.</p>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
          <p style="color: #555; font-size: 11px; margin: 0;">MitrAI &mdash; Find your perfect study partner at SVNIT</p>
        </div>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, code, password } = body;

    // ── Step 1: Send reset OTP ──
    if (action === 'request') {
      if (!email) {
        return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!rateLimit(`reset:${normalizedEmail}`, 3, 600_000)) return rateLimitExceeded();

      const svnitRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?svnit\.ac\.in$/;
      if (!svnitRegex.test(normalizedEmail)) {
        return NextResponse.json({ success: false, error: 'Only SVNIT emails allowed' }, { status: 400 });
      }

      // Check if user actually exists
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = users?.users?.some(u => u.email === normalizedEmail);

      if (!userExists) {
        // Don't reveal — pretend we sent it
        return NextResponse.json({ success: true, message: 'Reset code sent to your email.' });
      }

      // Clean expired OTPs
      await supabase.from('otp_codes').delete().lt('expires_at', new Date().toISOString());

      // Rate limit: don't re-send within 30 seconds
      const storedKey = `reset:${normalizedEmail}`;
      const { data: existing } = await supabase
        .from('otp_codes')
        .select('created_at')
        .eq('email', storedKey)
        .single();

      if (existing) {
        const createdAt = new Date(existing.created_at).getTime();
        if (Date.now() - createdAt < 30000) {
          return NextResponse.json({
            success: false,
            error: 'Please wait 30 seconds before requesting a new code',
          }, { status: 429 });
        }
      }

      const otpCode = String(crypto.randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Store with "reset:" prefix to avoid collision with login OTPs
      const { error: upsertError } = await supabase.from('otp_codes').upsert({
        email: storedKey,
        code: otpCode,
        expires_at: expiresAt,
        attempts: 0,
        created_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      if (upsertError) {
        console.error('[ResetOTP] Upsert error:', upsertError);
        return NextResponse.json({ success: false, error: 'Failed to generate reset code.' }, { status: 500 });
      }

      try {
        await sendResetOtpEmail(normalizedEmail, otpCode);
      } catch (emailErr) {
        console.error('[ResetOTP] Email error:', emailErr);
        await supabase.from('otp_codes').delete().eq('email', storedKey);
        return NextResponse.json({ success: false, error: 'Failed to send reset email. Please try again.' }, { status: 500 });
      }

      console.log(`[ResetOTP] Code sent to ${normalizedEmail}`);
      return NextResponse.json({ success: true, message: 'Reset code sent to your email.' });
    }

    // ── Step 2: Verify reset OTP ──
    if (action === 'verify') {
      if (!email || !code) {
        return NextResponse.json({ success: false, error: 'Email and code are required' }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const storedKey = `reset:${normalizedEmail}`;

      const { data: stored, error: fetchError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', storedKey)
        .single();

      if (fetchError || !stored) {
        return NextResponse.json({ success: false, error: 'No reset code found. Please request a new one.' }, { status: 400 });
      }

      if (new Date(stored.expires_at) < new Date()) {
        await supabase.from('otp_codes').delete().eq('email', storedKey);
        return NextResponse.json({ success: false, error: 'Code expired. Please request a new one.' }, { status: 400 });
      }

      if (stored.attempts >= 5) {
        await supabase.from('otp_codes').delete().eq('email', storedKey);
        return NextResponse.json({ success: false, error: 'Too many failed attempts. Please request a new code.' }, { status: 429 });
      }

      if (stored.code !== code.trim()) {
        await supabase.from('otp_codes').update({ attempts: stored.attempts + 1 }).eq('email', storedKey);
        return NextResponse.json({
          success: false,
          error: `Invalid code. ${5 - (stored.attempts + 1)} attempts remaining.`,
        }, { status: 400 });
      }

      // OTP verified — mark as verified (attempts = -1)
      await supabase.from('otp_codes').update({ attempts: -1 }).eq('email', storedKey);

      return NextResponse.json({ success: true, message: 'Code verified' });
    }

    // ── Step 3: Update password ──
    if (action === 'update') {
      if (!email || !password) {
        return NextResponse.json({ success: false, error: 'Email and new password are required' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const storedKey = `reset:${normalizedEmail}`;

      // Verify OTP was previously verified (attempts === -1)
      const { data: stored } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', storedKey)
        .single();

      if (!stored || stored.attempts !== -1) {
        return NextResponse.json({ success: false, error: 'Please verify your email first.' }, { status: 400 });
      }

      // Find user
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const targetUser = users?.users?.find(u => u.email === normalizedEmail);
      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUser.id,
        { password },
      );

      if (updateError) {
        console.error('[ResetPassword] Update error:', updateError);
        return NextResponse.json({ success: false, error: 'Failed to update password. Please try again.' }, { status: 500 });
      }

      // Clean up
      await supabase.from('otp_codes').delete().eq('email', storedKey);

      console.log(`[ResetPassword] Password updated for ${normalizedEmail}`);
      return NextResponse.json({ success: true, message: 'Password updated successfully!' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
