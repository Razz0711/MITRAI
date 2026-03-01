// ============================================
// MitrAI - Study Materials API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllMaterials, createMaterial, saveUploadedFile, addNotification } from '@/lib/store';
import { StudyMaterial } from '@/lib/types';
import { NOTIFICATION_TYPES } from '@/lib/constants';
import { sendPushToUsers } from '@/lib/store/push-subscriptions';
import { supabase } from '@/lib/store/core';
import { getAuthUser, unauthorized } from '@/lib/api-auth';
import { rateLimit, rateLimitExceeded } from '@/lib/rate-limit';
import { validateFileType, validateFileSize } from '@/lib/file-validation';

// GET /api/materials — list all materials with optional filters
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || undefined;
    const type = searchParams.get('type') || undefined;
    const year = searchParams.get('year') || undefined;
    const search = searchParams.get('search')?.toLowerCase() || undefined;

    const materials = await getAllMaterials({ department, type, year, search });

    return NextResponse.json({ success: true, data: materials });
  } catch (error) {
    console.error('Materials GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch materials' }, { status: 500 });
  }
}

// POST /api/materials — save material metadata (file already uploaded directly to Supabase Storage)
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(); if (!authUser) return unauthorized();
  if (!rateLimit(`materials:${authUser.id}`, 5, 60_000)) return rateLimitExceeded();
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let title: string, description: string, department: string, yearLevel: string;
    let subject: string, type: string, uploadedBy: string, uploadedByEmail: string;
    let fileName: string, fileSize: number, storedFileName: string;

    if (contentType.includes('application/json')) {
      // New flow: file already uploaded from browser, just save metadata
      const body = await request.json();
      title = body.title;
      description = body.description || '';
      department = body.department;
      yearLevel = body.yearLevel || '';
      subject = body.subject;
      type = body.type;
      uploadedBy = body.uploadedBy;
      uploadedByEmail = body.uploadedByEmail || '';
      fileName = body.fileName;
      fileSize = body.fileSize;
      storedFileName = body.storedFileName;

      if (!title || !department || !subject || !type || !storedFileName) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }
      // uploadedBy from client is the display name — keep it for the record
      // Auth is already verified via getAuthUser() above

      // Validate file type — block executables
      const fileCheck = validateFileType(fileName);
      if (!fileCheck.valid) {
        return NextResponse.json({ success: false, error: fileCheck.error }, { status: 400 });
      }
    } else {
      // Legacy flow: file uploaded via FormData through the API
      const formData = await request.formData();
      title = formData.get('title') as string;
      description = (formData.get('description') as string) || '';
      department = formData.get('department') as string;
      yearLevel = (formData.get('yearLevel') as string) || '';
      subject = formData.get('subject') as string;
      type = formData.get('type') as string;
      uploadedBy = formData.get('uploadedBy') as string;
      uploadedByEmail = (formData.get('uploadedByEmail') as string) || '';
      const file = formData.get('file') as File | null;

      if (!title || !department || !subject || !type || !file) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: title, department, subject, type, and file are required' },
          { status: 400 }
        );
      }
      // Auth is already verified via getAuthUser() above

      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: 'File too large. Maximum size is 10MB.' },
          { status: 400 }
        );
      }

      // Validate file type — block executables
      const fileTypeCheck = validateFileType(file.name);
      if (!fileTypeCheck.valid) {
        return NextResponse.json({ success: false, error: fileTypeCheck.error }, { status: 400 });
      }
      const sizeCheck = validateFileSize(file.size);
      if (!sizeCheck.valid) {
        return NextResponse.json({ success: false, error: sizeCheck.error }, { status: 400 });
      }

      fileName = file.name;
      fileSize = file.size;

      try {
        const arrayBuf = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        storedFileName = await saveUploadedFile(file.name, buffer);
      } catch (uploadErr) {
        console.error('[Upload] Storage error:', uploadErr);
        return NextResponse.json({ success: false, error: 'File upload failed' }, { status: 500 });
      }
    }

    const material: StudyMaterial = {
      id: uuidv4(),
      title,
      description,
      department,
      yearLevel,
      subject,
      type: type as StudyMaterial['type'],
      uploadedBy,
      uploadedByEmail,
      fileName,
      fileSize,
      storedFileName,
      createdAt: new Date().toISOString(),
    };

    await createMaterial(material);

    // Notify uploader (confirmation)
    try {
      await addNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: authUser.id,
        type: NOTIFICATION_TYPES.GOAL_ACHIEVEMENT,
        title: 'Material Uploaded!',
        message: `Your "${title}" has been uploaded successfully 📚`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch { /* non-critical */ }

    // Push notification only to students in the same department + year
    try {
      let query = supabase.from('students').select('id').neq('id', authUser.id);
      if (department) query = query.eq('department', department);
      if (yearLevel) query = query.eq('year_level', yearLevel);
      const { data: peers } = await query;
      const peerIds = (peers || []).map((p: { id: string }) => p.id);
      console.log(`[Materials] Notifying ${peerIds.length} peer(s) in ${department} / ${yearLevel}`);
      if (peerIds.length > 0) {
        // In-app notification for each peer
        await Promise.allSettled(peerIds.map(uid =>
          addNotification({
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${uid.slice(-4)}`,
            userId: uid,
            type: NOTIFICATION_TYPES.MATERIAL_UPLOADED,
            title: '📚 New Study Material',
            message: `"${title}" was uploaded for ${department}${yearLevel ? ` — ${yearLevel}` : ''}`,
            read: false,
            createdAt: new Date().toISOString(),
          })
        ));
        // Web push to those users
        sendPushToUsers(peerIds, {
          title: '📚 New Study Material',
          body: `"${title}" — ${department}${yearLevel ? ` (${yearLevel})` : ''}`,
          url: '/materials',
        }).catch(() => {});
      }
    } catch (e) { console.error('[Materials] peer notify error:', e); }

    return NextResponse.json({ success: true, data: material });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Materials POST error:', msg);
    return NextResponse.json({ success: false, error: `Failed to upload material: ${msg}` }, { status: 500 });
  }
}
