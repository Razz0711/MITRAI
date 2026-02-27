// ============================================
// MitrAI - OTP Verification API
// Generates and verifies email OTP codes
// Sends real OTP via Gmail SMTP (nodemailer)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// In-memory OTP store (resets on server restart)
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

// Clean expired OTPs periodically
function cleanExpired() {
  const now = Date.now();
  const keys = Array.from(otpStore.keys());
  keys.forEach(key => {
    const val = otpStore.get(key);
    if (val && val.expiresAt < now) otpStore.delete(key);
  });
}

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});

async function sendOtpEmail(to: string, code: string) {
  const mailOptions = {
    from: `"MitrAI" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: `${code} is your MitrAI verification code`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 28px 24px; text-align: center;">
          <div style="width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 12px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px; font-weight: bold; color: white;">M</span>
          </div>
          <h1 style="color: white; font-size: 22px; margin: 0;">MitrAI</h1>
          <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 4px 0 0;">Your SVNIT Study Buddy</p>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <p style="color: #e0e0e0; font-size: 15px; margin: 0 0 8px;">Your verification code is:</p>
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
  };

  await transporter.sendMail(mailOptions);
}

// POST /api/otp
// action: 'send' — generate and "send" OTP (demo: returns it in response)
// action: 'verify' — verify the OTP code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (action === 'send') {
      cleanExpired();

      // Rate limit: don't allow re-send within 30 seconds
      const existing = otpStore.get(normalizedEmail);
      if (existing && existing.expiresAt - 4.5 * 60 * 1000 > Date.now()) {
        // Less than 30s since last send
        return NextResponse.json({
          success: false,
          error: 'Please wait 30 seconds before requesting a new code',
        }, { status: 429 });
      }

      // Generate 6-digit OTP
      const code = String(Math.floor(100000 + Math.random() * 900000));

      // Store with 5-minute expiry
      otpStore.set(normalizedEmail, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
      });

      // Send OTP via email
      try {
        await sendOtpEmail(normalizedEmail, code);
      } catch (emailErr) {
        console.error('[OTP] Failed to send email:', emailErr);
        otpStore.delete(normalizedEmail);
        return NextResponse.json({
          success: false,
          error: 'Failed to send verification email. Please try again.',
        }, { status: 500 });
      }

      console.log(`[OTP] Code sent to ${normalizedEmail}`);

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email',
      });
    }

    if (action === 'verify') {
      const { code } = body;

      if (!code) {
        return NextResponse.json({ success: false, error: 'Verification code is required' }, { status: 400 });
      }

      const stored = otpStore.get(normalizedEmail);

      if (!stored) {
        return NextResponse.json({ success: false, error: 'No verification code found. Please request a new one.' }, { status: 400 });
      }

      if (stored.expiresAt < Date.now()) {
        otpStore.delete(normalizedEmail);
        return NextResponse.json({ success: false, error: 'Code expired. Please request a new one.' }, { status: 400 });
      }

      if (stored.attempts >= 5) {
        otpStore.delete(normalizedEmail);
        return NextResponse.json({ success: false, error: 'Too many failed attempts. Please request a new code.' }, { status: 429 });
      }

      if (stored.code !== code.trim()) {
        stored.attempts++;
        return NextResponse.json({
          success: false,
          error: `Invalid code. ${5 - stored.attempts} attempts remaining.`,
        }, { status: 400 });
      }

      // OTP verified — remove it
      otpStore.delete(normalizedEmail);

      return NextResponse.json({ success: true, message: 'Email verified successfully' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('OTP error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
