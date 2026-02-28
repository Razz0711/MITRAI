// ============================================
// MitrAI - Student CRUD Operations
// ============================================

import { StudentProfile } from '../types';
import { supabase, toRow, fromRow, STUDENT_DEFAULTS } from './core';

function studentToRow(s: StudentProfile): Record<string, unknown> { return toRow(s); }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToStudent(r: any): StudentProfile { return fromRow<StudentProfile>(r, STUDENT_DEFAULTS); }

export async function getAllStudents(limit = 200, offset = 0): Promise<StudentProfile[]> {
  const { data, error } = await supabase.from('students').select('*').range(offset, offset + limit - 1);
  if (error) { console.error('getAllStudents error:', error); return []; }
  return (data || []).map(rowToStudent);
}

export async function getStudentById(id: string): Promise<StudentProfile | undefined> {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToStudent(data);
}

export async function createStudent(student: StudentProfile): Promise<StudentProfile> {
  const row = studentToRow(student);
  const { error } = await supabase.from('students').upsert(row);
  if (error) console.error('createStudent error:', error);
  return student;
}

export async function updateStudent(id: string, updates: Partial<StudentProfile>): Promise<StudentProfile | null> {
  const existing = await getStudentById(id);
  if (!existing) return null;
  const merged = { ...existing, ...updates };
  const row = studentToRow(merged);
  const { error } = await supabase.from('students').upsert(row);
  if (error) { console.error('updateStudent error:', error); return null; }
  return merged;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) { console.error('deleteStudent error:', error); return false; }
  return true;
}
