// ============================================
// MitrAI - Notification Operations
// ============================================

import { Notification } from '../types';
import { supabase, toRow, fromRow } from './core';

export async function getNotifications(userId: string, limit = 100, offset = 0): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error('getNotifications error:', error); return []; }
  return (data || []).map((r: Record<string, unknown>) => fromRow<Notification>(r));
}

export async function addNotification(notification: Notification): Promise<void> {
  const { error } = await supabase.from('notifications').insert(toRow(notification));
  if (error) console.error('addNotification error:', error);
}

export async function markNotificationRead(userId: string, notifId: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notifId).eq('user_id', userId);
  if (error) console.error('markNotificationRead error:', error);
}
