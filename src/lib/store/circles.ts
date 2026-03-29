// ============================================
// MitrRAI - Circles Store
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

export async function getCircleMembers(circleId: string): Promise<{ userId: string; userName: string; department?: string }[]> {
  const { data, error } = await supabase
    .from('circle_memberships')
    .select('user_id')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getCircleMembers error:', error); return []; }

  const userIds = (data || []).map((r) => r.user_id as string);
  if (userIds.length === 0) return [];

  const { data: students } = await supabase
    .from('students')
    .select('id, name, department')
    .in('id', userIds);

  const infoMap = new Map((students || []).map((s) => [s.id as string, { name: s.name as string, department: s.department as string | undefined }]));

  // Fallback: fetch names from auth metadata for users not in students table
  const missingIds = userIds.filter((id) => !infoMap.has(id) || !infoMap.get(id)?.name);
  if (missingIds.length > 0) {
    console.log(`[getCircleMembers] ${missingIds.length} users missing from students table, trying auth...`);
  }
  for (const id of missingIds) {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(id);
      if (authError) {
        console.error(`[getCircleMembers] auth.admin.getUserById error for ${id}:`, authError.message);
        continue;
      }
      const authUser = authData?.user;
      if (authUser) {
        const meta = authUser.user_metadata || {};
        const name = meta.name
          || meta.full_name
          || meta.display_name
          || meta.preferred_username
          || (authUser.email ? authUser.email.split('@')[0] : null);
        console.log(`[getCircleMembers] auth user ${id}: email=${authUser.email}, meta.name=${meta.name}, resolved=${name}`);
        if (name) {
          infoMap.set(id, {
            name,
            department: meta.department,
          });
        }
      }
    } catch (err) {
      console.error(`[getCircleMembers] auth lookup failed for ${id}:`, err);
    }
  }

  return userIds.map((id) => ({
    userId: id,
    userName: infoMap.get(id)?.name || 'Member',
    department: infoMap.get(id)?.department,
  }));
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

// ─── Circle Messages ───────────────────────────────────────────────────────

export interface CircleMessage {
  id: string;
  circleId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'image' | 'document' | 'poll';
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export async function getCircleMessages(circleId: string, limit = 30, before?: string): Promise<CircleMessage[]> {
  let query = supabase
    .from('circle_messages')
    .select('*')
    .eq('circle_id', circleId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) { console.error('getCircleMessages:', error); return []; }
  return (data || []).map((r) => fromRow<CircleMessage>(r)).reverse();
}

export async function sendCircleMessage(
  circleId: string,
  senderId: string,
  senderName: string,
  text: string,
  type: 'text' | 'image' | 'document' | 'poll' = 'text',
  metadata: Record<string, unknown> | null = null,
): Promise<CircleMessage | null> {
  const { data, error } = await supabase
    .from('circle_messages')
    .insert({ circle_id: circleId, sender_id: senderId, sender_name: senderName, text, type, metadata })
    .select()
    .single();
  if (error) { console.error('sendCircleMessage:', error); return null; }
  return fromRow<CircleMessage>(data);
}

/** Vote on a poll */
export async function votePoll(messageId: string, userId: string, optionIndex: number): Promise<boolean> {
  // Upsert: update vote if already voted, insert if not
  const { error } = await supabase
    .from('circle_poll_votes')
    .upsert(
      { message_id: messageId, user_id: userId, option_index: optionIndex },
      { onConflict: 'message_id,user_id' }
    );
  if (error) { console.error('votePoll:', error); return false; }
  return true;
}

/** Get poll votes for a message */
export async function getPollVotes(messageId: string): Promise<{ userId: string; optionIndex: number }[]> {
  const { data, error } = await supabase
    .from('circle_poll_votes')
    .select('user_id, option_index')
    .eq('message_id', messageId);
  if (error) { console.error('getPollVotes:', error); return []; }
  return (data || []).map((r) => ({ userId: r.user_id as string, optionIndex: r.option_index as number }));
}

