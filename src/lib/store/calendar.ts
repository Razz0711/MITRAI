// ============================================
// MitrAI - Calendar Events
// ============================================

import { CalendarEvent } from '../types';
import { supabase, toRow, fromRow, CALENDAR_DEFAULTS } from './core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCalendarEvent(r: any): CalendarEvent { return fromRow<CalendarEvent>(r, CALENDAR_DEFAULTS); }
function calendarEventToRow(e: CalendarEvent): Record<string, unknown> { return toRow(e); }

export async function getCalendarEventsForUser(userId: string, limit = 200): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from('calendar_events').select('*').eq('user_id', userId).order('date', { ascending: true }).limit(limit);
  if (error) { console.error('getCalendarEventsForUser error:', error); return []; }
  return (data || []).map(rowToCalendarEvent);
}

export async function getCalendarEventsByDateRange(userId: string, startDate: string, endDate: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase.from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .or(`and(date.gte.${startDate},date.lte.${endDate}),recurring.eq.true`)
    .order('date', { ascending: true });
  if (error) { console.error('getCalendarEventsByDateRange error:', error); return []; }
  return (data || []).map(rowToCalendarEvent);
}

export async function createCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const row = calendarEventToRow(event);
  const { error } = await supabase.from('calendar_events').insert(row);
  if (error) console.error('createCalendarEvent error:', error);
  return event;
}

export async function getCalendarEventById(id: string): Promise<CalendarEvent | null> {
  const { data, error } = await supabase.from('calendar_events').select().eq('id', id).single();
  if (error || !data) return null;
  return rowToCalendarEvent(data);
}

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
  const partial = toRow(updates);
  const { data, error } = await supabase.from('calendar_events').update(partial).eq('id', id).select().single();
  if (error) { console.error('updateCalendarEvent error:', error); return null; }
  return rowToCalendarEvent(data);
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) { console.error('deleteCalendarEvent error:', error); return false; }
  return true;
}
