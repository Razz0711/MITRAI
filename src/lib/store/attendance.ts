// ============================================
// MitrAI - Attendance Operations
// ============================================

import { AttendanceRecord } from '../types';
import { supabase, toRow, fromRow, ATTENDANCE_DEFAULTS, ATTENDANCE_LOG_DEFAULTS } from './core';

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

// ── Attendance Log (per-day records for calendar) ──

export interface AttendanceLogEntry {
  id: string;
  userId: string;
  subject: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToLog(r: any): AttendanceLogEntry { return fromRow<AttendanceLogEntry>(r, ATTENDANCE_LOG_DEFAULTS); }
function logToRow(l: AttendanceLogEntry): Record<string, unknown> { return toRow(l); }

export async function getAttendanceLogs(userId: string, startDate: string, endDate: string): Promise<AttendanceLogEntry[]> {
  const { data, error } = await supabase
    .from('attendance_log')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
  if (error) { console.error('getAttendanceLogs error:', error); return []; }
  return (data || []).map(rowToLog);
}

export async function upsertAttendanceLog(entry: AttendanceLogEntry): Promise<AttendanceLogEntry> {
  const row = logToRow(entry);
  const { error } = await supabase.from('attendance_log').upsert(row, { onConflict: 'user_id,subject,date' });
  if (error) console.error('upsertAttendanceLog error:', error);
  return entry;
}

export async function deleteAttendanceLog(userId: string, subject: string, date: string): Promise<boolean> {
  const { error } = await supabase.from('attendance_log')
    .delete()
    .eq('user_id', userId)
    .eq('subject', subject)
    .eq('date', date);
  if (error) { console.error('deleteAttendanceLog error:', error); return false; }
  return true;
}

export async function deleteAttendanceLogsForSubject(userId: string, subject: string): Promise<boolean> {
  const { error } = await supabase.from('attendance_log')
    .delete()
    .eq('user_id', userId)
    .eq('subject', subject);
  if (error) { console.error('deleteAttendanceLogsForSubject error:', error); return false; }
  return true;
}
