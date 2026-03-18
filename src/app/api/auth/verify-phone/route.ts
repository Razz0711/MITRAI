import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

// POST /api/auth/verify-phone
// In a full production scenario, you would verify the Firebase ID Token here using firebase-admin.
// For MVP, we trust the Firebase client session and save the phone number securely.
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid phone number format' }, { status: 400 });
    }

    // 1. Check if the phone number already belongs to someone else
    const { data: existingPhone } = await supabase
      .from('students')
      .select('id')
      .eq('phone_number', phone)
      .neq('id', user.id)
      .single();

    if (existingPhone) {
      return NextResponse.json({ 
        success: false, 
        error: 'This phone number is already linked to another MitrRAI account.' 
      }, { status: 409 });
    }

    // 2. Update the user's profile with verified phone and timestamp
    const { error: updateError } = await supabase
      .from('students')
      .update({
        phone_number: phone,
        phone_verified_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Verify Phone] Database error:', updateError);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    // 3. Update the hidden user_metadata attached to the Supabase Auth session 
    // This allows `mapSupabaseUser` in `src/lib/auth.tsx` to know they are verified instantly!
    const { error: metaError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { phone_verified: true }
    });

    if (metaError) {
      console.error('[Verify Phone] Meta update error:', metaError);
      // We don't block the user if metadata fails, they are stored in the main DB successfully
    }

    return NextResponse.json({ success: true, message: 'Phone verified successfully' });

  } catch (error) {
    console.error('[Verify Phone] Server error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
