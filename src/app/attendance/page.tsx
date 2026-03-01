// ============================================
// MitrAI - Attendance Tracker Page
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { AttendanceRecord } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface AttendanceLogEntry {
  id: string;
  userId: string;
  subject: string;
  date: string;
  status: 'present' | 'absent';
  createdAt: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Add subject
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState('');

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState(0);
  const [editAttended, setEditAttended] = useState(0);

  // Bulk add
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Calendar
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [calendarLogs, setCalendarLogs] = useState<AttendanceLogEntry[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Per-subject calendar
  const [subjectCalId, setSubjectCalId] = useState<string | null>(null); // attendance record id
  const [subjectCalMonth, setSubjectCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [subjectCalLogs, setSubjectCalLogs] = useState<AttendanceLogEntry[]>([]);
  const [subjectCalLoading, setSubjectCalLoading] = useState(false);
  const pendingDays = useRef<Set<string>>(new Set()); // prevent double-taps

  const loadAttendance = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/attendance?userId=${user.id}`);
      const data = await res.json();
      if (data.success) setAttendance(data.data || []);
    } catch (err) { console.error('loadAttendance:', err); }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadAttendance();
    else setLoading(false);
  }, [user, loadAttendance]);

  const handleUpsert = async (record: AttendanceRecord, attended: number, total: number, logStatus?: 'present' | 'absent') => {
    // Optimistic: update UI immediately
    setAttendance(prev =>
      prev.map(a =>
        a.id === record.id
          ? { ...a, totalClasses: total, attendedClasses: attended, lastUpdated: new Date().toISOString() }
          : a
      )
    );
    // If subject calendar is open for this record, update its logs too
    if (subjectCalId === record.id && logStatus) {
      const today = new Date().toISOString().slice(0, 10);
      setSubjectCalLogs(prev => {
        const idx = prev.findIndex(l => l.date === today);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status: logStatus };
          return updated;
        }
        return [...prev, { id: `temp_${today}`, userId: record.userId, subject: record.subject, date: today, status: logStatus, createdAt: new Date().toISOString() }];
      });
    }
    // Fire API in background
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id,
          userId: record.userId,
          subject: record.subject,
          totalClasses: total,
          attendedClasses: attended,
          createdAt: record.createdAt,
          logStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        setAttendance(prev =>
          prev.map(a => a.id === record.id ? record : a)
        );
      } else if (showCalendar) {
        // Quietly refresh global calendar in background
        loadCalendarLogs();
      }
    } catch (err) {
      console.error('upsertAttendance:', err);
      setAttendance(prev => prev.map(a => a.id === record.id ? record : a));
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.trim() || !user) return;
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          subject: newSubject.trim(),
          totalClasses: 0,
          attendedClasses: 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadAttendance();
        setNewSubject('');
        setShowAddSubject(false);
      }
    } catch (err) { console.error('addSubject:', err); }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim() || !user) return;
    const subjects = bulkText.split('\n').map(s => s.trim()).filter(Boolean);
    // Filter out duplicates that already exist
    const newSubjects = subjects.filter(
      subject => !attendance.some(a => a.subject.toLowerCase() === subject.toLowerCase())
    );
    if (newSubjects.length === 0) {
      await loadAttendance();
      setBulkText('');
      setShowBulkAdd(false);
      return;
    }
    // Single batch API call instead of N sequential requests
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        subjects: newSubjects,
      }),
    });
    await loadAttendance();
    setBulkText('');
    setShowBulkAdd(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) setAttendance(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error('deleteAttendance:', err); }
  };

  // Stats
  const totalAll = attendance.reduce((s, a) => s + a.totalClasses, 0);
  const attendedAll = attendance.reduce((s, a) => s + a.attendedClasses, 0);
  const overallPct = totalAll > 0 ? Math.round((attendedAll / totalAll) * 100) : 0;
  const subjectsBelow75 = attendance.filter(a => a.totalClasses > 0 && (a.attendedClasses / a.totalClasses) < 0.75);
  const subjectsAbove90 = attendance.filter(a => a.totalClasses > 0 && (a.attendedClasses / a.totalClasses) >= 0.9);

  // ── Calendar helpers ──
  const loadCalendarLogs = useCallback(async () => {
    if (!user) return;
    setCalendarLoading(true);
    const y = calendarMonth.year;
    const m = calendarMonth.month;
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    try {
      const res = await fetch(`/api/attendance?userId=${user.id}&logs=true&start=${start}&end=${end}`);
      const data = await res.json();
      if (data.success) setCalendarLogs(data.data || []);
    } catch (err) { console.error('loadCalendarLogs:', err); }
    setCalendarLoading(false);
  }, [user, calendarMonth]);

  useEffect(() => {
    if (showCalendar && user) loadCalendarLogs();
  }, [showCalendar, calendarMonth, user, loadCalendarLogs]);

  // Build calendar grid data
  const getCalendarDays = () => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: string; day: number; present: number; absent: number; total: number }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayLogs = calendarLogs.filter(l => l.date === dateStr);
      const present = dayLogs.filter(l => l.status === 'present').length;
      const absent = dayLogs.filter(l => l.status === 'absent').length;
      days.push({ date: dateStr, day: d, present, absent, total: present + absent });
    }

    return { days, firstDay };
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const prevMonth = () => {
    setCalendarMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCalendarMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
    setSelectedDay(null);
  };

  // ── Per-subject calendar helpers ──
  const loadSubjectCalLogs = useCallback(async (subject: string) => {
    if (!user) return;
    setSubjectCalLoading(true);
    const y = subjectCalMonth.year;
    const m = subjectCalMonth.month;
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    try {
      const res = await fetch(`/api/attendance?userId=${user.id}&logs=true&start=${start}&end=${end}`);
      const data = await res.json();
      if (data.success) {
        // Filter logs for this specific subject
        const logs = (data.data || []).filter((l: AttendanceLogEntry) => l.subject === subject);
        setSubjectCalLogs(logs);
      }
    } catch (err) { console.error('loadSubjectCalLogs:', err); }
    setSubjectCalLoading(false);
  }, [user, subjectCalMonth]);

  // Load subject calendar logs when expanded or month changes
  useEffect(() => {
    if (subjectCalId && user) {
      const record = attendance.find(a => a.id === subjectCalId);
      if (record) loadSubjectCalLogs(record.subject);
    }
  }, [subjectCalId, subjectCalMonth, user, attendance, loadSubjectCalLogs]);

  const toggleSubjectCal = (recordId: string) => {
    if (subjectCalId === recordId) {
      setSubjectCalId(null);
      setSubjectCalLogs([]);
    } else {
      setSubjectCalId(recordId);
      setSubjectCalMonth(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
      });
    }
  };

  const subjectCalPrevMonth = () => {
    setSubjectCalMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const subjectCalNextMonth = () => {
    setSubjectCalMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const handleToggleDay = async (record: AttendanceRecord, dateStr: string) => {
    if (!user) return;
    // Prevent double-tap on same day while API is in-flight
    if (pendingDays.current.has(dateStr)) return;
    pendingDays.current.add(dateStr);

    // Read current status from state
    const existing = subjectCalLogs.find(l => l.date === dateStr);
    const prevStatus = existing?.status || null;

    // Cycle: null → present → absent → remove
    let action: 'present' | 'absent' | 'remove';
    if (!prevStatus) action = 'present';
    else if (prevStatus === 'present') action = 'absent';
    else action = 'remove';

    // Calculate expected deltas
    let totalDelta = 0;
    let attendedDelta = 0;
    if (action === 'remove') {
      if (prevStatus === 'present') { totalDelta = -1; attendedDelta = -1; }
      else if (prevStatus === 'absent') { totalDelta = -1; }
    } else if (prevStatus === null) {
      totalDelta = 1;
      attendedDelta = action === 'present' ? 1 : 0;
    } else if (prevStatus === 'present' && action === 'absent') {
      attendedDelta = -1;
    } else if (prevStatus === 'absent' && action === 'present') {
      attendedDelta = 1;
    }

    // OPTIMISTIC: update UI instantly
    const prevLogs = [...subjectCalLogs];
    const prevAttendance = attendance.find(a => a.id === record.id)!;

    if (action === 'remove') {
      setSubjectCalLogs(prev => prev.filter(l => l.date !== dateStr));
    } else {
      setSubjectCalLogs(prev => {
        const idx = prev.findIndex(l => l.date === dateStr);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status: action as 'present' | 'absent' };
          return updated;
        }
        return [...prev, { id: `temp_${dateStr}`, userId: user.id, subject: record.subject, date: dateStr, status: action as 'present' | 'absent', createdAt: new Date().toISOString() }];
      });
    }
    setAttendance(prev =>
      prev.map(a =>
        a.id === record.id
          ? {
              ...a,
              totalClasses: Math.max(0, a.totalClasses + totalDelta),
              attendedClasses: Math.max(0, a.attendedClasses + attendedDelta),
              lastUpdated: new Date().toISOString(),
            }
          : a
      )
    );

    // Fire API in background
    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          userId: user.id,
          subject: record.subject,
          date: dateStr,
          action,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        setSubjectCalLogs(prevLogs);
        setAttendance(prev => prev.map(a => a.id === record.id ? prevAttendance : a));
      } else if (showCalendar) {
        loadCalendarLogs(); // Quietly refresh global calendar
      }
    } catch (err) {
      console.error('handleToggleDay:', err);
      setSubjectCalLogs(prevLogs);
      setAttendance(prev => prev.map(a => a.id === record.id ? prevAttendance : a));
    } finally {
      pendingDays.current.delete(dateStr);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <LoadingSkeleton type="rows" count={5} label="Loading attendance..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--muted)]">Please log in to track attendance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            📊 <span className="gradient-text">Attendance Tracker</span>
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">Track and manage your class attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowBulkAdd(!showBulkAdd); setShowAddSubject(false); }}
            className="btn-secondary text-xs"
          >
            📋 Bulk Add
          </button>
          <button
            onClick={() => { setShowAddSubject(!showAddSubject); setShowBulkAdd(false); }}
            className="btn-primary text-xs"
          >
            + Add Subject
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      {attendance.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Overall</p>
            <p className={`text-lg font-bold ${
              overallPct >= 75 ? 'text-green-400' : overallPct >= 60 ? 'text-amber-400' : 'text-red-400'
            }`}>{overallPct}%</p>
            <p className="text-[10px] text-[var(--muted)]">{attendedAll}/{totalAll} classes</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Subjects</p>
            <p className="text-lg font-bold">{attendance.length}</p>
            <p className="text-[10px] text-[var(--muted)]">Total tracked</p>
          </div>
          <div className="card p-3 border-red-500/20">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">⚠️ Below 75%</p>
            <p className="text-lg font-bold text-red-400">{subjectsBelow75.length}</p>
            <p className="text-[10px] text-[var(--muted)]">Need attention</p>
          </div>
          <div className="card p-3 border-green-500/20">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">🌟 Above 90%</p>
            <p className="text-lg font-bold text-green-400">{subjectsAbove90.length}</p>
            <p className="text-[10px] text-[var(--muted)]">Excellent!</p>
          </div>
        </div>
      )}

      {/* Expandable Calendar */}
      {attendance.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full card p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">📅</span>
              <span className="text-xs font-semibold">Attendance Calendar</span>
              <span className="text-[10px] text-[var(--muted)]">Daily attendance log</span>
            </div>
            <span className={`text-xs transition-transform duration-200 ${showCalendar ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showCalendar && (
            <div className="card p-4 mt-1 fade-in">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors">◀</button>
                <h3 className="text-sm font-bold">
                  {monthNames[calendarMonth.month]} {calendarMonth.year}
                </h3>
                <button onClick={nextMonth} className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors">▶</button>
              </div>

              {calendarLoading ? (
                <div className="text-center py-6">
                  <p className="text-xs text-[var(--muted)]">Loading calendar...</p>
                </div>
              ) : (
                <>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center text-[9px] text-[var(--muted)] font-medium py-1">{d}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  {(() => {
                    const { days, firstDay } = getCalendarDays();
                    const today = new Date().toISOString().slice(0, 10);
                    const cells: React.ReactNode[] = [];

                    // Empty cells for offset
                    for (let i = 0; i < firstDay; i++) {
                      cells.push(<div key={`empty-${i}`} />);
                    }

                    // Day cells
                    days.forEach(d => {
                      const isToday = d.date === today;
                      const isSelected = selectedDay === d.date;
                      let dotColor = '';
                      if (d.total > 0) {
                        const ratio = d.present / d.total;
                        if (ratio >= 0.75) dotColor = 'bg-green-500';
                        else if (ratio >= 0.5) dotColor = 'bg-amber-500';
                        else dotColor = 'bg-red-500';
                      }

                      cells.push(
                        <button
                          key={d.date}
                          onClick={() => setSelectedDay(isSelected ? null : d.date)}
                          className={`relative flex flex-col items-center justify-center p-1 rounded-lg text-[11px] transition-colors min-h-[36px] ${
                            isSelected ? 'bg-[var(--primary)]/20 ring-1 ring-[var(--primary)]' :
                            isToday ? 'bg-white/10 font-bold' :
                            'hover:bg-white/5'
                          }`}
                        >
                          <span className={isToday ? 'text-[var(--primary-light)]' : ''}>{d.day}</span>
                          {d.total > 0 && (
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-0.5`} />
                          )}
                        </button>
                      );
                    });

                    return (
                      <div className="grid grid-cols-7 gap-1">
                        {cells}
                      </div>
                    );
                  })()}

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[9px] text-[var(--muted)]">≥75%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-[9px] text-[var(--muted)]">50-74%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-[9px] text-[var(--muted)]">&lt;50%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-white/20" />
                      <span className="text-[9px] text-[var(--muted)]">No data</span>
                    </div>
                  </div>

                  {/* Selected day detail */}
                  {selectedDay && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] fade-in">
                      <h4 className="text-xs font-semibold mb-2">
                        📋 {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </h4>
                      {(() => {
                        const dayLogs = calendarLogs.filter(l => l.date === selectedDay);
                        if (dayLogs.length === 0) {
                          return <p className="text-[10px] text-[var(--muted)]">No attendance recorded this day</p>;
                        }
                        return (
                          <div className="space-y-1">
                            {dayLogs.map(l => (
                              <div key={l.id} className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-white/5">
                                <span className="font-medium">{l.subject}</span>
                                <span className={l.status === 'present' ? 'text-green-400' : 'text-red-400'}>
                                  {l.status === 'present' ? '✓ Present' : '✗ Absent'}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Subject Form */}
      {showAddSubject && (
        <div className="card p-4 mb-4 fade-in">
          <h3 className="text-sm font-semibold mb-3">Add New Subject</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="e.g. Data Structures, Operating Systems..."
              className="input-field text-sm flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
              autoFocus
            />
            <button onClick={handleAddSubject} className="btn-primary text-xs px-4">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Bulk Add Form */}
      {showBulkAdd && (
        <div className="card p-4 mb-4 fade-in">
          <h3 className="text-sm font-semibold mb-2">Bulk Add Subjects</h3>
          <p className="text-[10px] text-[var(--muted)] mb-3">Enter one subject per line</p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Data Structures\nOperating Systems\nComputer Networks\nDBMS\nDiscrete Mathematics"}
            className="input-field text-sm w-full h-32 resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowBulkAdd(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleBulkAdd} className="btn-primary text-xs px-4">
              Add All ({bulkText.split('\n').filter(s => s.trim()).length} subjects)
            </button>
          </div>
        </div>
      )}

      {/* Subject Cards */}
      {attendance.length === 0 ? (
        <div className="card p-12 text-center">
          <span className="text-4xl mb-3 block">📋</span>
          <h2 className="text-sm font-semibold mb-1">No subjects added yet</h2>
          <p className="text-xs text-[var(--muted)] mb-4">Add your subjects to start tracking attendance</p>
          <button
            onClick={() => setShowAddSubject(true)}
            className="btn-primary text-xs"
          >
            + Add Your First Subject
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {attendance.map((a) => {
            const pct = a.totalClasses > 0 ? Math.round((a.attendedClasses / a.totalClasses) * 100) : 0;
            const isEditing = editingId === a.id;
            const colorClass = pct >= 75 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : pct > 0 ? 'bg-red-500' : 'bg-white/20';
            const textColor = pct >= 75 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : pct > 0 ? 'text-red-400' : 'text-[var(--muted)]';
            const bgTint = pct >= 75 ? 'border-green-500/10' : pct >= 60 ? 'border-amber-500/10' : pct > 0 ? 'border-red-500/10' : '';

            // Calculate classes needed for 75%
            let classesNeeded = '';
            if (a.totalClasses > 0 && pct < 75) {
              const x = Math.ceil((0.75 * a.totalClasses - a.attendedClasses) / 0.25);
              if (x > 0) classesNeeded = `Attend next ${x} classes consecutively to reach 75%`;
            }
            // Calculate classes can skip
            let canSkip = '';
            if (a.totalClasses > 0 && pct > 75) {
              const x = Math.floor(a.attendedClasses / 0.75 - a.totalClasses);
              if (x > 0) canSkip = `You can safely skip ${x} class${x > 1 ? 'es' : ''} and still stay above 75%`;
            }

            return (
              <div key={a.id} className={`card p-4 transition-all hover:shadow-lg ${bgTint}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Subject Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold truncate">{a.subject}</h3>
                      <span className={`text-xs font-bold ${textColor}`}>{a.totalClasses > 0 ? `${pct}%` : 'N/A'}</span>
                      {pct >= 90 && <span className="text-[10px]">🌟</span>}
                      {pct > 0 && pct < 75 && <span className="text-[10px]">⚠️</span>}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--muted)]">
                        {a.attendedClasses}/{a.totalClasses} classes attended
                      </span>
                      {classesNeeded && <span className="text-[10px] text-red-400">📌 {classesNeeded}</span>}
                      {canSkip && <span className="text-[10px] text-green-400">✅ {canSkip}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isEditing ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpsert(a, a.attendedClasses + 1, a.totalClasses + 1, 'present')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors font-medium"
                        title="Mark as present"
                      >
                        ✓ Present
                      </button>
                      <button
                        onClick={() => handleUpsert(a, a.attendedClasses, a.totalClasses + 1, 'absent')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors font-medium"
                        title="Mark as absent"
                      >
                        ✗ Absent
                      </button>
                      <button
                        onClick={() => toggleSubjectCal(a.id)}
                        className={`text-xs px-2 py-1.5 rounded-lg transition-colors ${
                          subjectCalId === a.id ? 'bg-[var(--primary)]/20 text-[var(--primary-light)]' : 'hover:bg-white/10 text-[var(--muted)]'
                        }`}
                        title="Day-wise calendar"
                      >
                        📅
                      </button>
                      <button
                        onClick={() => { setEditingId(a.id); setEditTotal(a.totalClasses); setEditAttended(a.attendedClasses); }}
                        className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] transition-colors"
                        title="Edit manually"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-xs px-2 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition-colors"
                        title="Remove subject"
                      >
                        🗑
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0 p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-[var(--muted)]">Attended:</label>
                        <input
                          type="number"
                          min={0}
                          max={editTotal}
                          value={editAttended}
                          onChange={(e) => setEditAttended(Math.max(0, parseInt(e.target.value) || 0))}
                          className="input-field text-xs w-16 text-center py-1"
                        />
                      </div>
                      <span className="text-xs text-[var(--muted)]">/</span>
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-[var(--muted)]">Total:</label>
                        <input
                          type="number"
                          min={0}
                          value={editTotal}
                          onChange={(e) => setEditTotal(Math.max(0, parseInt(e.target.value) || 0))}
                          className="input-field text-xs w-16 text-center py-1"
                        />
                      </div>
                      <button
                        onClick={() => {
                          handleUpsert(a, Math.min(editAttended, editTotal), editTotal);
                          setEditingId(null);
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)]/20 text-[var(--primary-light)] hover:bg-[var(--primary)]/30 transition-colors font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Per-subject mini calendar */}
                {subjectCalId === a.id && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] fade-in">
                    {/* Month nav — sleek */}
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={subjectCalPrevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90 text-[var(--muted)]">◀</button>
                      <div className="text-center">
                        <h4 className="text-xs font-bold tracking-wide">
                          {monthNames[subjectCalMonth.month]} {subjectCalMonth.year}
                        </h4>
                        {/* Month stats */}
                        {!subjectCalLoading && (() => {
                          const { year, month } = subjectCalMonth;
                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                          const presentCount = subjectCalLogs.filter(l => l.status === 'present').length;
                          const absentCount = subjectCalLogs.filter(l => l.status === 'absent').length;
                          const unmarked = daysInMonth - presentCount - absentCount;
                          return (
                            <p className="text-[9px] text-[var(--muted)] mt-0.5">
                              <span className="text-green-400 font-medium">{presentCount}P</span>
                              {' · '}
                              <span className="text-red-400 font-medium">{absentCount}A</span>
                              {' · '}
                              <span>{unmarked} unmarked</span>
                            </p>
                          );
                        })()}
                      </div>
                      <button onClick={subjectCalNextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90 text-[var(--muted)]">▶</button>
                    </div>

                    {subjectCalLoading ? (
                      <div className="text-center py-6">
                        <div className="inline-block w-5 h-5 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={`${d}-${i}`} className="text-center text-[9px] text-[var(--muted)] font-semibold py-1">{d}</div>
                          ))}
                        </div>

                        {/* Calendar grid */}
                        {(() => {
                          const { year, month } = subjectCalMonth;
                          const firstDay = new Date(year, month, 1).getDay();
                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                          const today = new Date().toISOString().slice(0, 10);
                          const cells: React.ReactNode[] = [];

                          for (let i = 0; i < firstDay; i++) {
                            cells.push(<div key={`se-${i}`} className="min-h-[32px]" />);
                          }

                          for (let d = 1; d <= daysInMonth; d++) {
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const log = subjectCalLogs.find(l => l.date === dateStr);
                            const isToday = dateStr === today;
                            const isFuture = dateStr > today;
                            const isPending = pendingDays.current.has(dateStr);

                            let cellBg = 'bg-white/[0.03] hover:bg-white/10';
                            let cellText = '';
                            let cellRing = '';
                            let statusIcon = '';
                            if (log?.status === 'present') {
                              cellBg = 'bg-green-500/20 hover:bg-green-500/30';
                              cellText = 'text-green-300 font-semibold';
                              cellRing = 'ring-1 ring-green-500/30';
                              statusIcon = '✓';
                            } else if (log?.status === 'absent') {
                              cellBg = 'bg-red-500/20 hover:bg-red-500/30';
                              cellText = 'text-red-300 font-semibold';
                              cellRing = 'ring-1 ring-red-500/30';
                              statusIcon = '✗';
                            }

                            cells.push(
                              <button
                                key={dateStr}
                                onClick={() => !isFuture && !isPending && handleToggleDay(a, dateStr)}
                                disabled={isFuture || isPending}
                                className={`relative flex flex-col items-center justify-center rounded-lg min-h-[32px] transition-all duration-150 ${
                                  isFuture ? 'opacity-25 cursor-not-allowed' :
                                  isPending ? 'opacity-50 animate-pulse' :
                                  'cursor-pointer active:scale-90'
                                } ${cellBg} ${cellText} ${cellRing} ${
                                  isToday ? 'ring-2 ring-[var(--primary)]/50' : ''
                                }`}
                                title={
                                  isFuture ? 'Future date' :
                                  log ? `${log.status} — tap to change` :
                                  'Tap to mark present'
                                }
                              >
                                <span className={`text-[11px] leading-none ${isToday && !log ? 'text-[var(--primary-light)] font-bold' : ''}`}>{d}</span>
                                {statusIcon && (
                                  <span className="text-[7px] leading-none mt-[1px]">{statusIcon}</span>
                                )}
                              </button>
                            );
                          }

                          return (
                            <div className="grid grid-cols-7 gap-[3px]">
                              {cells}
                            </div>
                          );
                        })()}

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-[var(--border)]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-green-500/25 ring-1 ring-green-500/30 flex items-center justify-center text-[6px] text-green-300">✓</span>
                            <span className="text-[9px] text-[var(--muted)]">Present</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-red-500/25 ring-1 ring-red-500/30 flex items-center justify-center text-[6px] text-red-300">✗</span>
                            <span className="text-[9px] text-[var(--muted)]">Absent</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-white/[0.03]" />
                            <span className="text-[9px] text-[var(--muted)]">Empty</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-center text-[var(--muted)] mt-1">Tap a day to cycle: empty → present → absent → clear</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 75% Rule Info */}
      {attendance.length > 0 && (
        <div className="card p-4 mt-6 border-[var(--primary)]/20">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <h3 className="text-xs font-semibold mb-1">75% Attendance Rule</h3>
              <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                Most universities (including SVNIT) require a minimum of 75% attendance in each subject to be eligible for exams.
                Subjects marked in <span className="text-red-400 font-medium">red</span> are below this threshold.
                The tracker shows how many consecutive classes you need to attend to reach 75%, or how many you can safely skip while staying above 75%.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
