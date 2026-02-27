// ============================================
// MitrAI - Calendar Page
// Monthly view + day detail + add/edit events
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { CalendarEvent, CalendarEventType } from '@/lib/types';

const EVENT_COLORS: Record<CalendarEventType, { bg: string; text: string; border: string; label: string }> = {
  class:      { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/25',   label: '📘 Class' },
  study:      { bg: 'bg-green-500/15',  text: 'text-green-400',  border: 'border-green-500/25',  label: '📖 Study' },
  exam:       { bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/25',    label: '📝 Exam' },
  assignment: { bg: 'bg-amber-500/15',  text: 'text-amber-400',  border: 'border-amber-500/25',  label: '📋 Assignment' },
  meeting:    { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/25', label: '🤝 Meeting' },
  reminder:   { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   border: 'border-cyan-500/25',   label: '🔔 Reminder' },
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Current view month/year
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth()); // 0-indexed

  // Selected date for detail view
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Add event modal
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<CalendarEventType>('class');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formRoom, setFormRoom] = useState('');
  const [formRecurring, setFormRecurring] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const loadEvents = useCallback(async () => {
    if (!user) return;
    try {
      // Compute date range: first day visible on grid to last day visible
      const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // day-of-week offset
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const start = new Date(viewYear, viewMonth, 1 - firstDay); // grid start (prev month overflow)
      const totalCells = firstDay + daysInMonth;
      const trailingDays = (7 - (totalCells % 7)) % 7;
      const end = new Date(viewYear, viewMonth + 1, trailingDays + 1); // day after last visible

      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);

      const res = await fetch(`/api/calendar?userId=${user.id}&start=${startStr}&end=${endStr}`);
      const data = await res.json();
      if (data.success) setEvents(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [user, viewYear, viewMonth]);

  useEffect(() => {
    if (user) loadEvents();
  }, [user, loadEvents]);

  // ── Calendar Grid Helpers ──

  function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
  }

  function getDateString(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function getEventsForDate(dateStr: string): CalendarEvent[] {
    const dayOfWeek = DAYS_FULL[new Date(dateStr).getDay()];
    return events.filter(e => {
      if (e.date === dateStr) return true;
      // Recurring events: show on matching day of week
      if (e.recurring && e.recurringDay === dayOfWeek) return true;
      return false;
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  // ── Navigation ──

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function goToday() {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(now.toISOString().slice(0, 10));
  }

  // ── Event CRUD ──

  function openAddEvent(date?: string) {
    setEditingEvent(null);
    setFormTitle('');
    setFormDesc('');
    setFormType('class');
    setFormDate(date || selectedDate);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormRoom('');
    setFormRecurring(false);
    setShowAddEvent(true);
  }

  function openEditEvent(event: CalendarEvent) {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDesc(event.description);
    setFormType(event.type);
    setFormDate(event.date);
    setFormStartTime(event.startTime);
    setFormEndTime(event.endTime);
    setFormRoom(event.room);
    setFormRecurring(event.recurring);
    setShowAddEvent(true);
  }

  async function handleSubmitEvent() {
    if (!user || !formTitle || !formDate || !formStartTime) return;
    setFormSubmitting(true);

    try {
      if (editingEvent) {
        // Update
        await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            eventId: editingEvent.id,
            updates: {
              title: formTitle,
              description: formDesc,
              type: formType,
              date: formDate,
              startTime: formStartTime,
              endTime: formEndTime,
              room: formRoom,
              recurring: formRecurring,
              recurringDay: formRecurring ? DAYS_FULL[new Date(formDate).getDay()] : '',
            },
          }),
        });
      } else {
        // Create
        await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            userId: user.id,
            title: formTitle,
            description: formDesc,
            type: formType,
            date: formDate,
            startTime: formStartTime,
            endTime: formEndTime,
            room: formRoom,
            recurring: formRecurring,
            recurringDay: formRecurring ? DAYS_FULL[new Date(formDate).getDay()] : '',
          }),
        });
      }

      setShowAddEvent(false);
      await loadEvents();
    } catch { /* ignore */ }
    setFormSubmitting(false);
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', eventId }),
      });
      await loadEvents();
    } catch { /* ignore */ }
  }

  // ── Build calendar grid ──

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  // Week view - get current week
  const selectedDateObj = new Date(selectedDate);
  const weekStart = new Date(selectedDateObj);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // Day events for detail panel
  const selectedDayEvents = getEventsForDate(selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Stats
  const thisMonthEvents = events.filter(e => e.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`));
  const totalClasses = thisMonthEvents.filter(e => e.type === 'class').length;
  const totalStudy = thisMonthEvents.filter(e => e.type === 'study').length;
  const totalExams = thisMonthEvents.filter(e => e.type === 'exam').length;

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold mb-2">Calendar</h1>
        <p className="text-xs text-[var(--muted)] mb-4">Please log in to view your calendar.</p>
        <Link href="/login" className="btn-primary text-sm">Log In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold">
            <span className="gradient-text">Calendar</span>
          </h1>
          <p className="text-xs text-[var(--muted)]">Classes, study sessions, exams & reminders</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${viewMode === 'month' ? 'bg-[var(--primary)]/20 text-[var(--primary-light)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${viewMode === 'week' ? 'bg-[var(--primary)]/20 text-[var(--primary-light)]' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
            >
              Week
            </button>
          </div>
          <button onClick={() => openAddEvent()} className="btn-primary text-xs">
            + Add Event
          </button>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-2.5 text-center">
          <p className="text-lg font-bold text-blue-400">{totalClasses}</p>
          <p className="text-[10px] text-[var(--muted)]">Classes</p>
        </div>
        <div className="card p-2.5 text-center">
          <p className="text-lg font-bold text-green-400">{totalStudy}</p>
          <p className="text-[10px] text-[var(--muted)]">Study Sessions</p>
        </div>
        <div className="card p-2.5 text-center">
          <p className="text-lg font-bold text-red-400">{totalExams}</p>
          <p className="text-[10px] text-[var(--muted)]">Exams/Deadlines</p>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="btn-secondary text-xs px-3 py-1.5">◀</button>
        <div className="text-center">
          <h2 className="text-sm font-bold">{MONTHS[viewMonth]} {viewYear}</h2>
          <button onClick={goToday} className="text-[10px] text-[var(--primary-light)] hover:underline">Today</button>
        </div>
        <button onClick={nextMonth} className="btn-secondary text-xs px-3 py-1.5">▶</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          {viewMode === 'month' ? (
            <div className="card p-3">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-[var(--muted)] py-1">{d}</div>
                ))}
              </div>
              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: totalCells }).map((_, i) => {
                  const dayNum = i - firstDay + 1;
                  const isOutside = dayNum < 1 || dayNum > daysInMonth;
                  const dateStr = isOutside ? '' : getDateString(viewYear, viewMonth, dayNum);
                  const dayEvents = isOutside ? [] : getEventsForDate(dateStr);
                  const isToday = dateStr === today;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      key={i}
                      onClick={() => { if (!isOutside) setSelectedDate(dateStr); }}
                      disabled={isOutside}
                      className={`relative p-1 rounded-lg text-left transition-all min-h-[3.5rem] ${
                        isOutside ? 'opacity-0 cursor-default' :
                        isSelected ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/30 ring-1 ring-[var(--primary)]/20' :
                        isToday ? 'bg-[var(--surface-light)] border border-[var(--border)]' :
                        'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {!isOutside && (
                        <>
                          <span className={`text-[11px] font-medium ${isToday ? 'text-[var(--primary-light)] font-bold' : isSelected ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                            {dayNum}
                          </span>
                          {/* Event dots */}
                          {dayEvents.length > 0 && (
                            <div className="flex gap-0.5 mt-0.5 flex-wrap">
                              {dayEvents.slice(0, 3).map((e, ei) => (
                                <span key={ei} className={`w-1.5 h-1.5 rounded-full ${EVENT_COLORS[e.type]?.bg.replace('/15', '')} opacity-80`} style={{ backgroundColor: e.type === 'class' ? '#3b82f6' : e.type === 'study' ? '#22c55e' : e.type === 'exam' ? '#ef4444' : e.type === 'assignment' ? '#f59e0b' : e.type === 'meeting' ? '#a855f7' : '#06b6d4' }} />
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[8px] text-[var(--muted)]">+{dayEvents.length - 3}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Week View */
            <div className="card p-3">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + i);
                  const dateStr = d.toISOString().slice(0, 10);
                  const dayEvents = getEventsForDate(dateStr);
                  const isToday = dateStr === today;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`p-2 rounded-lg text-center transition-all ${
                        isSelected ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/30' :
                        isToday ? 'bg-[var(--surface-light)] border border-[var(--border)]' :
                        'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <p className="text-[10px] text-[var(--muted)]">{DAYS_SHORT[i]}</p>
                      <p className={`text-sm font-bold ${isToday ? 'text-[var(--primary-light)]' : ''}`}>{d.getDate()}</p>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 justify-center mt-1">
                          {dayEvents.slice(0, 3).map((e, ei) => (
                            <span key={ei} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.type === 'class' ? '#3b82f6' : e.type === 'study' ? '#22c55e' : e.type === 'exam' ? '#ef4444' : '#f59e0b' }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Full day timeline for week view */}
              <div className="space-y-1.5 mt-3">
                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-[var(--muted)] text-center py-4">No events for this day</p>
                ) : (
                  selectedDayEvents.map(event => (
                    <EventCard key={event.id} event={event} onEdit={openEditEvent} onDelete={handleDeleteEvent} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Event Type Legend */}
          <div className="flex flex-wrap gap-2 mt-3">
            {(Object.keys(EVENT_COLORS) as CalendarEventType[]).map(type => (
              <div key={type} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${EVENT_COLORS[type].bg} ${EVENT_COLORS[type].text} border ${EVENT_COLORS[type].border}`}>
                {EVENT_COLORS[type].label}
              </div>
            ))}
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                {selectedDate === today && (
                  <span className="text-[10px] text-[var(--primary-light)]">Today</span>
                )}
              </div>
              <button onClick={() => openAddEvent(selectedDate)} className="text-[10px] text-[var(--primary-light)] hover:underline">
                + Add
              </button>
            </div>

            {loading ? (
              <div className="text-center py-6">
                <div className="w-6 h-6 mx-auto rounded-full bg-[var(--primary)]/20 animate-pulse" />
                <p className="text-[10px] text-[var(--muted)] mt-2">Loading events...</p>
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-3xl block mb-2">📅</span>
                <p className="text-xs text-[var(--muted)]">No events scheduled</p>
                <button onClick={() => openAddEvent(selectedDate)} className="text-xs text-[var(--primary-light)] hover:underline mt-2">
                  Add an event
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map(event => (
                  <EventCard key={event.id} event={event} onEdit={openEditEvent} onDelete={handleDeleteEvent} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming events */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Upcoming</h3>
            <div className="space-y-2">
              {events
                .filter(e => e.date >= today && !e.recurring)
                .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                .slice(0, 5)
                .map(event => (
                  <div key={event.id} className={`p-2 rounded-lg ${EVENT_COLORS[event.type]?.bg} border ${EVENT_COLORS[event.type]?.border}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold ${EVENT_COLORS[event.type]?.text}`}>{event.title}</p>
                      <p className="text-[10px] text-[var(--muted)]">{event.startTime}</p>
                    </div>
                    <p className="text-[10px] text-[var(--muted)]">
                      {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {event.room ? ` · ${event.room}` : ''}
                    </p>
                  </div>
                ))
              }
              {events.filter(e => e.date >= today && !e.recurring).length === 0 && (
                <p className="text-xs text-[var(--muted)] text-center py-3">No upcoming events</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="card p-6 w-full max-w-md slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
              <button onClick={() => setShowAddEvent(false)} className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg">×</button>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="label">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Data Structures Lecture"
                  className="input-field text-xs"
                />
              </div>

              {/* Type */}
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(EVENT_COLORS) as CalendarEventType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setFormType(type)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
                        formType === type
                          ? `${EVENT_COLORS[type].bg} ${EVENT_COLORS[type].text} ${EVENT_COLORS[type].border}`
                          : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {EVENT_COLORS[type].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Time *</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={e => setFormStartTime(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={e => setFormEndTime(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              {/* Room */}
              <div>
                <label className="label">Room / Location</label>
                <input
                  type="text"
                  value={formRoom}
                  onChange={e => setFormRoom(e.target.value)}
                  placeholder="e.g. Room 301, Library"
                  className="input-field text-xs"
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Optional notes..."
                  className="input-field text-xs resize-none h-16"
                />
              </div>

              {/* Recurring */}
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/5">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formRecurring}
                  onChange={e => setFormRecurring(e.target.checked)}
                  className="rounded border-[var(--border)] accent-[var(--primary)]"
                />
                <label htmlFor="recurring" className="text-xs text-[var(--foreground)] cursor-pointer">
                  Repeat every week on {formDate ? DAYS_FULL[new Date(formDate).getDay()] : 'this day'}
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddEvent(false)} className="btn-secondary flex-1 text-xs">
                  Cancel
                </button>
                <button
                  onClick={handleSubmitEvent}
                  disabled={!formTitle || !formDate || !formStartTime || formSubmitting}
                  className="btn-primary flex-1 text-xs disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Event Card Component ──

function EventCard({ event, onEdit, onDelete }: { event: CalendarEvent; onEdit: (e: CalendarEvent) => void; onDelete: (id: string) => void }) {
  const colors = EVENT_COLORS[event.type] || EVENT_COLORS.class;

  return (
    <div className={`p-2.5 rounded-lg ${colors.bg} border ${colors.border} group`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-xs font-semibold ${colors.text}`}>{event.title}</p>
            {event.recurring && <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-[var(--muted)]">🔁 Weekly</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] text-[var(--muted)]">
              {event.startTime}{event.endTime ? ` - ${event.endTime}` : ''}
            </p>
            {event.room && <p className="text-[10px] text-[var(--muted)]">📍 {event.room}</p>}
          </div>
          {event.description && (
            <p className="text-[10px] text-[var(--muted)] mt-1 line-clamp-2">{event.description}</p>
          )}
          {event.buddyName && (
            <p className="text-[10px] text-[var(--muted)] mt-0.5">👥 with {event.buddyName}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
          <button onClick={() => onEdit(event)} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--muted)] hover:text-[var(--foreground)]">✏️</button>
          <button onClick={() => onDelete(event.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-red-400 hover:text-red-300">🗑️</button>
        </div>
      </div>
    </div>
  );
}
