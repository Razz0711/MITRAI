// ============================================
// MitrAI - Anonymous Doubts Store
// ============================================

import { supabase, fromRow, toRow } from './core';

export interface Doubt {
  id: string;
  userId: string;
  department: string;
  subject: string;
  question: string;
  isAnonymous: boolean;
  upvotes: number;
  status: string;
  createdAt: string;
}

export interface DoubtReply {
  id: string;
  doubtId: string;
  userId: string;
  userName: string;
  reply: string;
  isAnonymous: boolean;
  isAccepted: boolean;
  upvotes: number;
  createdAt: string;
}

// ── Doubts CRUD ──

// Auto-delete doubts (and their replies) older than 24 hours
export async function cleanupExpiredDoubts(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // First delete replies for expired doubts
  const { data: oldDoubts } = await supabase.from('doubts').select('id').lt('created_at', cutoff);
  if (oldDoubts && oldDoubts.length > 0) {
    const ids = oldDoubts.map(d => d.id);
    await supabase.from('doubt_replies').delete().in('doubt_id', ids);
  }
  // Then delete the expired doubts
  const { data, error } = await supabase.from('doubts').delete().lt('created_at', cutoff).select('id');
  if (error) { console.error('cleanupExpiredDoubts error:', error); return 0; }
  const count = data?.length || 0;
  if (count > 0) console.log(`[Doubts] Cleaned up ${count} expired doubt(s)`);
  return count;
}

export async function getDoubts(filters?: { department?: string; status?: string }, limit = 50): Promise<Doubt[]> {
  let query = supabase.from('doubts').select('*').order('created_at', { ascending: false }).limit(limit);
  if (filters?.department) query = query.eq('department', filters.department);
  if (filters?.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) { console.error('getDoubts error:', error); return []; }
  return (data || []).map((r) => fromRow<Doubt>(r));
}

export async function getDoubtById(id: string): Promise<Doubt | null> {
  const { data, error } = await supabase.from('doubts').select('*').eq('id', id).single();
  if (error || !data) return null;
  return fromRow<Doubt>(data);
}

export async function createDoubt(doubt: Omit<Doubt, 'upvotes' | 'status' | 'createdAt'>): Promise<Doubt | null> {
  const row = toRow({ ...doubt, upvotes: 0, status: 'open', createdAt: new Date().toISOString() });
  const { error } = await supabase.from('doubts').insert(row);
  if (error) { console.error('createDoubt error:', error); return null; }
  return { ...doubt, upvotes: 0, status: 'open', createdAt: new Date().toISOString() } as Doubt;
}

export async function upvoteDoubt(doubtId: string): Promise<boolean> {
  const doubt = await getDoubtById(doubtId);
  if (!doubt) return false;
  const { error } = await supabase.from('doubts').update({ upvotes: doubt.upvotes + 1 }).eq('id', doubtId);
  if (error) { console.error('upvoteDoubt error:', error); return false; }
  return true;
}

export async function closeDoubt(doubtId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('doubts')
    .update({ status: 'answered' })
    .eq('id', doubtId)
    .eq('user_id', userId);
  if (error) { console.error('closeDoubt error:', error); return false; }
  return true;
}

// ── Replies ──
export async function getDoubtReplies(doubtId: string): Promise<DoubtReply[]> {
  const { data, error } = await supabase
    .from('doubt_replies')
    .select('*')
    .eq('doubt_id', doubtId)
    .order('created_at');
  if (error) { console.error('getDoubtReplies error:', error); return []; }
  return (data || []).map((r) => fromRow<DoubtReply>(r));
}

export async function addDoubtReply(reply: Omit<DoubtReply, 'id' | 'isAccepted' | 'upvotes' | 'createdAt'>): Promise<boolean> {
  const row = toRow({ ...reply, isAccepted: false, upvotes: 0, createdAt: new Date().toISOString() });
  const { error } = await supabase.from('doubt_replies').insert(row);
  if (error) { console.error('addDoubtReply error:', error); return false; }
  return true;
}

export async function acceptReply(replyId: string): Promise<boolean> {
  const { error } = await supabase.from('doubt_replies').update({ is_accepted: true }).eq('id', replyId);
  if (error) { console.error('acceptReply error:', error); return false; }
  return true;
}
