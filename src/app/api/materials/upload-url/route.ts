// ============================================
// MitrAI - Signed Upload URL API
// Creates a signed URL for direct browser-to-Supabase upload
// This bypasses Vercel's 4.5MB body limit
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, unauthorized } from '@/lib/api-auth';

// Ensure the materials bucket exists (using service role key)
async function ensureBucket() {
  const { data } = await supabase.storage.getBucket('materials');
  if (!data) {
    const { error } = await supabase.storage.createBucket('materials', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    });
    if (error && !error.message?.includes('already exists')) {
      throw new Error('Cannot create storage bucket: ' + error.message);
    }
  }
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { fileName } = await request.json();
    
    if (!fileName) {
      return NextResponse.json({ success: false, error: 'fileName is required' }, { status: 400 });
    }

    await ensureBucket();

    const ext = (fileName.split('.').pop() || 'bin').toLowerCase();
    const storedName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // Create a signed upload URL (valid for 2 minutes)
    const { data, error } = await supabase.storage
      .from('materials')
      .createSignedUploadUrl(storedName);

    if (error) {
      console.error('[SignedUpload] Error creating signed URL:', error.message);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create upload URL' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      storedName,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[SignedUpload] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
