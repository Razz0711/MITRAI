// ============================================
// MitrAI - Attendance Operations
// ============================================

import { AttendanceRecord } from '../types';
import { supabase, toRow, fromRow, ATTENDANCE_DEFAULTS } from './core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAttendance(r: any): AttendanceRecord { return fromRow<AttendanceRecord>(r, ATTENDANCE_DEFAULTS); }
function attendanceToRow(a: AttendanceRecord): Record<string, unknown> { return toRow(a); }

export async function getAttendanceForUser(userId: string, limit = 100): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase.from('attendance').select('*').eq('user_id', userId).order('subject').limit(limit);
  if (error) { console.error('getAttendanceForUser error:', error); return []; }
  return (data || []).map(rowToAttendance);
}

export async function upsertAttendance(record: AttendanceRecord): Promise<AttendanceRecord> {
  const row = attendanceToRow(record);
  const { error } = await supabase.from('attendance').upsert(row, { onConflict: 'id' });
  if (error) console.error('upsertAttendance error:', error);
  return record;
}

export async function upsertBulkAttendance(records: AttendanceRecord[]): Promise<AttendanceRecord[]> {
  if (records.length === 0) return [];
  const rows = records.map(attendanceToRow);
  const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'id' });
  if (error) console.error('upsertBulkAttendance error:', error);
  return records;
}

export async function deleteAttendance(id: string): Promise<boolean> {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) { console.error('deleteAttendance error:', error); return false; }
  return true;
}

export async function getAttendanceRecordById(id: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase.from('attendance').select('*').eq('id', id).single();
  if (error || !data) return null;
  return rowToAttendance(data);
}
