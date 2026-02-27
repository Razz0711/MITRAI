// ============================================
// MitrAI - Study Materials API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllMaterials, createMaterial, saveUploadedFile } from '@/lib/store';
import { StudyMaterial } from '@/lib/types';

// GET /api/materials — list all materials with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const type = searchParams.get('type');
    const year = searchParams.get('year');
    const search = searchParams.get('search')?.toLowerCase();

    let materials = getAllMaterials();

    if (department && department !== 'all') {
      materials = materials.filter(m => m.department === department);
    }
    if (type && type !== 'all') {
      materials = materials.filter(m => m.type === type);
    }
    if (year && year !== 'all') {
      materials = materials.filter(m => m.yearLevel === year);
    }
    if (search) {
      materials = materials.filter(
        m =>
          m.title.toLowerCase().includes(search) ||
          m.subject.toLowerCase().includes(search) ||
          m.description.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, data: materials });
  } catch (error) {
    console.error('Materials GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch materials' }, { status: 500 });
  }
}

// POST /api/materials — upload a new material
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const department = formData.get('department') as string;
    const yearLevel = formData.get('yearLevel') as string;
    const subject = formData.get('subject') as string;
    const type = formData.get('type') as string;
    const uploadedBy = formData.get('uploadedBy') as string;
    const uploadedByEmail = formData.get('uploadedByEmail') as string;
    const file = formData.get('file') as File | null;

    // Validation
    if (!title || !department || !subject || !type || !uploadedBy || !file) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, department, subject, type, and file are required' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const storedFileName = saveUploadedFile(file.name, buffer);

    const material: StudyMaterial = {
      id: uuidv4(),
      title,
      description: description || '',
      department,
      yearLevel: yearLevel || '',
      subject,
      type: type as StudyMaterial['type'],
      uploadedBy,
      uploadedByEmail: uploadedByEmail || '',
      fileName: file.name,
      fileSize: file.size,
      storedFileName,
      createdAt: new Date().toISOString(),
    };

    createMaterial(material);

    return NextResponse.json({ success: true, data: material });
  } catch (error) {
    console.error('Materials POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload material' }, { status: 500 });
  }
}
