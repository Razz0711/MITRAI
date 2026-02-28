// ============================================
// MitrAI - Session Bookings Operations
// ============================================

import { SessionBooking } from '../types';
import { supabase, toRow, fromRow } from './core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToBooking(r: any): SessionBooking { return fromRow<SessionBooking>(r); }

export async function getAllBookings(limit = 100, offset = 0): Promise<SessionBooking[]> {
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error('getAllBookings error:', error); return []; }
  return (data || []).map(rowToBooking);
}

export async function getBookingsForUser(userId: string, limit = 100, offset = 0): Promise<SessionBooking[]> {
  const { data, error } = await supabase.from('bookings').select('*').or(`requester_id.eq.${userId},target_id.eq.${userId}`).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error('getBookingsForUser error:', error); return []; }
  return (data || []).map(rowToBooking);
}

export async function getBookingById(id: string): Promise<SessionBooking | undefined> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToBooking(data);
}

export async function createBooking(booking: SessionBooking): Promise<SessionBooking> {
  const { error } = await supabase.from('bookings').insert(toRow(booking));
  if (error) console.error('createBooking error:', error);
  return booking;
}

export async function updateBooking(id: string, updates: Partial<SessionBooking>): Promise<SessionBooking | null> {
  const { error } = await supabase.from('bookings').update(toRow(updates)).eq('id', id);
  if (error) { console.error('updateBooking error:', error); return null; }
  return { id, ...updates } as SessionBooking;
}
