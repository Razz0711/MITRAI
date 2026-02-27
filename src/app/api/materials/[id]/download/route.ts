// ============================================
// MitrAI - Download Material File
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getMaterialById, getUploadedFileUrl } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const material = await getMaterialById(params.id);
    if (!material) {
      return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });
    }

    const fileUrl = getUploadedFileUrl(material.storedFileName);

    // Redirect to Supabase Storage public URL for download
    return NextResponse.redirect(fileUrl);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ success: false, error: 'Failed to download file' }, { status: 500 });
  }
}
