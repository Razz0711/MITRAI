// ============================================
// MitrAI - User Availability & Status Operations
// ============================================

import { UserAvailability, UserStatus } from '../types';
import { supabase, toRow, fromRow } from './core';

// ─── Availability ───

export async function getUserAvailability(userId: string): Promise<UserAvailability | undefined> {
  const { data, error } = await supabase.from('availability').select('*').eq('user_id', userId).single();
  if (error || !data) return undefined;
  return { userId: data.user_id, slots: data.slots || [], updatedAt: data.updated_at };
}

export async function setUserAvailability(avail: UserAvailability): Promise<void> {
  const { error } = await supabase.from('availability').upsert(toRow(avail));
  if (error) console.error('setUserAvailability error:', error);
}

export async function markSlotEngaged(userId: string, day: string, hour: number, sessionId: string, buddyName: string): Promise<void> {
  const ua = await getUserAvailability(userId);
  if (ua) {
    const slot = ua.slots.find(s => s.day === day && s.hour === hour);
    if (slot) {
      slot.status = 'engaged';
      slot.sessionId = sessionId;
      slot.buddyName = buddyName;
    }
    await setUserAvailability(ua);
  }
}

// ─── User Status ───

export async function getUserStatus(userId: string): Promise<UserStatus | undefined> {
  const { data, error } = await supabase.from('user_statuses').select('*').eq('user_id', userId).single();
  if (error || !data) return undefined;
  return {
    userId: data.user_id,
    status: data.status,
    lastSeen: data.last_seen,
    currentSubject: data.current_subject || undefined,
    sessionStartedAt: data.session_started_at || undefined,
    hideStatus: data.hide_status,
    hideSubject: data.hide_subject,
  };
}

export async function getAllUserStatuses(limit = 500): Promise<UserStatus[]> {
  const { data, error } = await supabase.from('user_statuses').select('*').limit(limit);
  if (error) { console.error('getAllUserStatuses error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<UserStatus>(r));
}

export async function updateUserStatus(userId: string, updates: Partial<UserStatus>): Promise<UserStatus> {
  const existing = await getUserStatus(userId);
  const merged: UserStatus = {
    userId,
    status: updates.status ?? existing?.status ?? 'offline',
    lastSeen: updates.lastSeen ?? existing?.lastSeen ?? new Date().toISOString(),
    currentSubject: updates.currentSubject ?? existing?.currentSubject,
    sessionStartedAt: updates.sessionStartedAt ?? existing?.sessionStartedAt,
    hideStatus: updates.hideStatus ?? existing?.hideStatus ?? false,
    hideSubject: updates.hideSubject ?? existing?.hideSubject ?? false,
  };
  const { error } = await supabase.from('user_statuses').upsert(toRow(merged));
  if (error) console.error('updateUserStatus error:', error);
  return merged;
}
