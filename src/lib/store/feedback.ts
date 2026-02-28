// ============================================
// MitrAI - Feedback Operations
// ============================================

import { Feedback } from '../types';
import { supabase, toRow, fromRow } from './core';

export async function createFeedback(fb: Feedback): Promise<Feedback> {
  const { error } = await supabase.from('feedback').insert(toRow(fb));
  if (error) { console.error('createFeedback error:', error); }
  return fb;
}

export async function getAllFeedback(limit = 100): Promise<Feedback[]> {
  const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) { console.error('getAllFeedback error:', error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((r: any) => fromRow<Feedback>(r));
}
