// ============================================
// MitrAI - Circles Store
// ============================================

import { supabase, fromRow, toRow } from './core';

export interface Circle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
}

export interface CircleMembership {
  id: string;
  userId: string;
  circleId: string;
  profileData: Record<string, unknown>;
  createdAt: string;
}

export async function getAllCircles(): Promise<Circle[]> {
  const { data, error } = await supabase.from('circles').select('*').order('name');
  if (error) { console.error('getAllCircles error:', error); return []; }
  return (data || []).map((r) => fromRow<Circle>(r));
}

export async function getUserCircles(userId: string): Promise<CircleMembership[]> {
  const { data, error } = await supabase
    .from('circle_memberships')
    .select('*')
    .eq('user_id', userId);
  if (error) { console.error('getUserCircles error:', error); return []; }
  return (data || []).map((r) => fromRow<CircleMembership>(r));
}

export async function joinCircle(userId: string, circleId: string, profileData: Record<string, unknown> = {}): Promise<boolean> {
  const { error } = await supabase.from('circle_memberships').upsert(
    toRow({ userId, circleId, profileData, createdAt: new Date().toISOString() }),
    { onConflict: 'user_id,circle_id' }
  );
  if (error) { console.error('joinCircle error:', error); return false; }
  return true;
}

export async function leaveCircle(userId: string, circleId: string): Promise<boolean> {
  const { error } = await supabase
    .from('circle_memberships')
    .delete()
    .eq('user_id', userId)
    .eq('circle_id', circleId);
  if (error) { console.error('leaveCircle error:', error); return false; }
  return true;
}

export async function getCircleMembers(circleId: string): Promise<CircleMembership[]> {
  const { data, error } = await supabase
    .from('circle_memberships')
    .select('*')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getCircleMembers error:', error); return []; }
  return (data || []).map((r) => fromRow<CircleMembership>(r));
}

/** Returns a map of circleId → member count for all circles */
export async function getAllCircleMemberCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('circle_memberships').select('circle_id');
  if (error) { console.error('getAllCircleMemberCounts error:', error); return {}; }
  const counts: Record<string, number> = {};
  (data || []).forEach((r) => {
    const cid = r.circle_id as string;
    counts[cid] = (counts[cid] || 0) + 1;
  });
  return counts;
}

/** Get a single circle by ID */
export async function getCircleById(circleId: string): Promise<Circle | null> {
  const { data, error } = await supabase.from('circles').select('*').eq('id', circleId).single();
  if (error || !data) return null;
  return fromRow<Circle>(data);
}
