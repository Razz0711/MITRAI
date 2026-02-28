// ============================================
// MitrAI - Session Operations
// ============================================

import { StudySession } from '../types';
import { supabase, toRow, fromRow } from './core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(r: any): StudySession { return fromRow<StudySession>(r); }

export async function getAllSessions(limit = 100): Promise<StudySession[]> {
  const { data, error } = await supabase.from('sessions').select('*').limit(limit);
  if (error) { console.error('getAllSessions error:', error); return []; }
  return (data || []).map(rowToSession);
}

export async function getSessionsByStudent(studentId: string): Promise<StudySession[]> {
  const { data, error } = await supabase.from('sessions').select('*').or(`student1_id.eq.${studentId},student2_id.eq.${studentId}`);
  if (error) { console.error('getSessionsByStudent error:', error); return []; }
  return (data || []).map(rowToSession);
}

export async function createSession(session: StudySession): Promise<StudySession> {
  const { error } = await supabase.from('sessions').upsert(toRow(session));
  if (error) console.error('createSession error:', error);
  return session;
}

export async function updateSession(id: string, updates: Partial<StudySession>): Promise<StudySession | null> {
  const { error } = await supabase.from('sessions').update(toRow(updates)).eq('id', id);
  if (error) { console.error('updateSession error:', error); return null; }
  return { id, ...updates } as StudySession;
}
