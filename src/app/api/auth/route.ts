// ============================================
// MitrAI - Auth API Route
// Handles signup via Supabase Auth Admin API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseService } from '@/lib/supabase';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { parseStudentEmail } from '@/lib/email-parser';

// Admin client for user creation (uses service role key)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'signup') {
      const { name, email, password, admissionNumber, department, yearLevel, dob,
              matchKey, programType, batchYear, deptCode, rollNo, deptKnown, profileAutoFilled } = body;

      // Rate limit signups by email (10 attempts per 10 minutes)
      if (email && !rateLimit(`auth:${email}`, 10, 600_000)) return rateLimitExceeded();

      if (!name || !email || !password || !dob) {
        return NextResponse.json({ success: false, error: 'Name, email, password, and date of birth are required' }, { status: 400 });
      }

      // Validate SVNIT email
      const svnitRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?svnit\.ac\.in$/;
      if (!svnitRegex.test(email)) {
        return NextResponse.json({ success: false, error: 'Only SVNIT emails allowed' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      // Parse email to auto-fill if not provided by client
      const parsed = parseStudentEmail(email.trim().toLowerCase());
      const finalAdmNo = admissionNumber || parsed?.admissionNumber || '';
      const finalDept = department || parsed?.department || '';
      const finalYear = yearLevel || parsed?.yearLevel || '';
      const finalMatchKey = matchKey || parsed?.matchKey || '';
      const finalProgramType = programType || parsed?.programType || '';
      const finalBatchYear = batchYear || parsed?.batchYear || '';
      const finalDeptCode = deptCode || parsed?.deptCode || '';
      const finalRollNo = rollNo || parsed?.rollNo || '';
      const finalDeptKnown = deptKnown ?? parsed?.deptKnown ?? true;
      const finalAutoFilled = profileAutoFilled ?? !!parsed;

      // Create Supabase Auth user with admin API (auto-confirmed, no email verification needed since we verified via OTP)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          admissionNumber: finalAdmNo.trim().toUpperCase(),
          department: finalDept,
          yearLevel: finalYear,
          dob,
          showBirthday: true,
          matchKey: finalMatchKey,
          programType: finalProgramType,
          batchYear: finalBatchYear,
          deptCode: finalDeptCode,
          rollNo: finalRollNo,
          deptKnown: finalDeptKnown,
          profileAutoFilled: finalAutoFilled,
        },
      });

      if (authError) {
        if (authError.message.includes('already') || authError.message.includes('exists')) {
          return NextResponse.json({ success: false, error: 'An account with this email already exists' }, { status: 409 });
        }
        console.error('[Auth] Signup error:', authError);
        return NextResponse.json({ success: false, error: 'Failed to create account. Please try again.' }, { status: 500 });
      }

      const userId = authData.user.id;

      // Auto-create a minimal student profile so this user is immediately visible for matching
      try {
        let currentStudy = parsed?.currentStudy || `B.Tech ${finalDept}`;
        if (!parsed) {
          if (finalDept.startsWith('Integrated')) currentStudy = finalDept;
          else if (finalDept === 'Mathematics & Computing') currentStudy = 'B.Tech Mathematics & Computing';
        }

        await supabaseService.from('students').upsert({
          id: userId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          admission_number: finalAdmNo.trim().toUpperCase(),
          department: finalDept,
          year_level: finalYear,
          dob: dob || '',
          show_birthday: true,
          current_study: currentStudy,
          institution: 'SVNIT Surat',
          city: 'Surat',
          country: 'India',
          timezone: 'IST',
          preferred_language: 'English',
          match_key: finalMatchKey,
          program_type: finalProgramType,
          batch_year: finalBatchYear,
          dept_code: finalDeptCode,
          roll_no: finalRollNo,
          dept_known: finalDeptKnown,
          profile_auto_filled: finalAutoFilled,
        }, { onConflict: 'id' });
      } catch (err) {
        console.error('profileUpsert:', err);
        // Best-effort — profile will be completed during onboarding
      }

      return NextResponse.json({ success: true, userId });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Auth] Error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
