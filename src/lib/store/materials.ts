// ============================================
// MitrAI - Study Materials Operations
// ============================================

import { StudyMaterial } from '../types';
import { supabase, toRow, fromRow } from './core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToMaterial(r: any): StudyMaterial { return fromRow<StudyMaterial>(r); }

export async function getAllMaterials(filters?: {
  department?: string; type?: string; year?: string; search?: string;
}, limit = 50, offset = 0): Promise<StudyMaterial[]> {
  let query = supabase.from('materials').select('*');
  if (filters?.department && filters.department !== 'all') query = query.eq('department', filters.department);
  if (filters?.type && filters.type !== 'all') query = query.eq('type', filters.type);
  if (filters?.year && filters.year !== 'all') query = query.eq('year_level', filters.year);
  if (filters?.search) {
    // Sanitize search input to prevent PostgREST filter injection
    const safe = filters.search.replace(/[,().%\\]/g, '');
    if (safe) query = query.or(`title.ilike.%${safe}%,subject.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  const { data, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error('getAllMaterials error:', error); return []; }
  return (data || []).map(rowToMaterial);
}

export async function getMaterialById(id: string): Promise<StudyMaterial | undefined> {
  const { data, error } = await supabase.from('materials').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToMaterial(data);
}

export async function getMaterialsByDepartment(department: string): Promise<StudyMaterial[]> {
  return getAllMaterials({ department });
}

export async function createMaterial(material: StudyMaterial): Promise<StudyMaterial> {
  const { error } = await supabase.from('materials').insert(toRow(material));
  if (error) console.error('createMaterial error:', error);
  return material;
}

export async function deleteMaterial(id: string): Promise<boolean> {
  const mat = await getMaterialById(id);
  if (!mat) return false;
  try {
    await supabase.storage.from('materials').remove([mat.storedFileName]);
  } catch (e) { console.error('Failed to delete uploaded file:', e); }
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) { console.error('deleteMaterial error:', error); return false; }
  return true;
}

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  zip: 'application/zip',
};

let bucketChecked = false;

async function ensureBucketExists() {
  if (bucketChecked) return;
  try {
    const { data, error: getErr } = await supabase.storage.getBucket('materials');
    console.log('[Storage] getBucket result:', data ? 'exists' : 'not found', getErr?.message || '');
    if (!data) {
      const { error: createError } = await supabase.storage.createBucket('materials', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      if (createError) {
        if (createError.message?.includes('already exists')) {
          console.log('[Storage] Bucket already exists (race condition)');
        } else {
          console.error('[Storage] Failed to create bucket:', createError.message);
          throw new Error('Cannot create storage bucket: ' + createError.message);
        }
      } else {
        console.log('[Storage] Created materials bucket successfully');
      }
    }
    bucketChecked = true;
  } catch (err) {
    console.error('[Storage] ensureBucketExists error:', err);
    throw err;
  }
}

export async function saveUploadedFile(fileName: string, buffer: Buffer): Promise<string> {
  await ensureBucketExists();
  const ext = (fileName.split('.').pop() || 'bin').toLowerCase();
  const storedName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  console.log(`[Storage] Uploading ${storedName} (${contentType}, ${buffer.length} bytes)`);
  
  const uint8 = new Uint8Array(buffer);
  const { error } = await supabase.storage.from('materials').upload(storedName, uint8, {
    contentType,
    upsert: false,
  });
  if (error) {
    console.error('[Storage] Upload error:', error.message, JSON.stringify(error));
    throw new Error('Storage upload failed: ' + error.message);
  }
  console.log(`[Storage] Upload success: ${storedName}`);
  return storedName;
}

export function getUploadedFileUrl(storedFileName: string): string {
  const { data } = supabase.storage.from('materials').getPublicUrl(storedFileName);
  return data.publicUrl;
}
