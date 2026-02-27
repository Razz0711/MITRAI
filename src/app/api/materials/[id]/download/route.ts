// ============================================
// MitrAI - Download Material File
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getMaterialById, getUploadedFilePath } from '@/lib/store';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const material = await getMaterialById(params.id);
    if (!material) {
      return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });
    }

    const filePath = getUploadedFilePath(material.storedFileName);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: 'File not found on server' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${material.fileName}"`);
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Length', String(fileBuffer.length));

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ success: false, error: 'Failed to download file' }, { status: 500 });
  }
}
