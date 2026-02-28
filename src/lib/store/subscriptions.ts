// ============================================
// MitrAI - Subscription Operations
// ============================================

import { Subscription } from '../types';
import { supabase, toRow } from './core';

export async function getUserSubscription(userId: string): Promise<Subscription | undefined> {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();
  if (error || !data) return undefined;
  return { userId: data.user_id, plan: data.plan, startDate: data.start_date, endDate: data.end_date, status: data.status, transactionId: data.transaction_id || '', createdAt: data.created_at };
}

export async function setUserSubscription(sub: Subscription): Promise<Subscription> {
  const { error } = await supabase.from('subscriptions').upsert(toRow(sub));
  if (error) console.error('setUserSubscription error:', error);
  return sub;
}

export async function getAllPendingSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('status', 'pending');
  if (error || !data) return [];
  return data.map((d: Record<string, string>) => ({ userId: d.user_id, plan: d.plan as Subscription['plan'], startDate: d.start_date, endDate: d.end_date, status: d.status as Subscription['status'], transactionId: d.transaction_id || '', createdAt: d.created_at }));
}

export async function approveSubscription(userId: string): Promise<boolean> {
  const sub = await getUserSubscription(userId);
  if (!sub || sub.status !== 'pending') return false;
  const now = new Date();
  let endDate = '';
  if (sub.plan === 'monthly') { const end = new Date(now); end.setMonth(end.getMonth() + 1); endDate = end.toISOString(); }
  else if (sub.plan === 'yearly') { const end = new Date(now); end.setFullYear(end.getFullYear() + 1); endDate = end.toISOString(); }
  const { error } = await supabase.from('subscriptions').update({ status: 'active', start_date: now.toISOString(), end_date: endDate }).eq('user_id', userId);
  if (error) { console.error('approveSubscription error:', error); return false; }
  return true;
}

export async function rejectSubscription(userId: string): Promise<boolean> {
  const { error } = await supabase.from('subscriptions').update({ status: 'cancelled', plan: 'free' }).eq('user_id', userId);
  if (error) { console.error('rejectSubscription error:', error); return false; }
  return true;
}
