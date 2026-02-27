// ============================================
// MitrAI - OTP Verification API
// Generates and verifies email OTP codes
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// In-memory OTP store (resets on server restart — acceptable for demo)
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

      // In a real app, you'd send this via email (nodemailer, resend, etc.)
      // For demo/development, we return it in the response
      console.log(`[OTP] Code for ${normalizedEmail}: ${code}`);

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email',
        // DEMO MODE: showing OTP in response since we can't send real emails
        // In production, remove this line and use a real email service
        demoCode: code,
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
