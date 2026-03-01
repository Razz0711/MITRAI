// ============================================
// MitrAI - Attendance Tracker Page (Performance Rewrite)
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HEADERS_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_HEADERS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end, lastDay };
}

function ds(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState(0);
  const [editAttended, setEditAttended] = useState(0);

  // Global calendar
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [calendarLogs, setCalendarLogs] = useState<AttendanceLogEntry[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Per-subject calendar
  const [subjectCalId, setSubjectCalId] = useState<string | null>(null);
  const [subjectCalMonth, setSubjectCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [subjectCalLogs, setSubjectCalLogs] = useState<AttendanceLogEntry[]>([]);
  const [subjectCalLoading, setSubjectCalLoading] = useState(false);

  // Refs for breaking dependency cycles
  const pendingDays = useRef<Set<string>>(new Set());
  const attendanceRef = useRef(attendance);
  attendanceRef.current = attendance;
  const showCalendarRef = useRef(showCalendar);
  showCalendarRef.current = showCalendar;

  // ── Memoized derived data ──
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const stats = useMemo(() => {
    const totalAll = attendance.reduce((s, a) => s + a.totalClasses, 0);
    const attendedAll = attendance.reduce((s, a) => s + a.attendedClasses, 0);
    const overallPct = totalAll > 0 ? Math.round((attendedAll / totalAll) * 100) : 0;
    const below75 = attendance.filter(a => a.totalClasses > 0 && (a.attendedClasses / a.totalClasses) < 0.75).length;
    const above90 = attendance.filter(a => a.totalClasses > 0 && (a.attendedClasses / a.totalClasses) >= 0.9).length;
    return { totalAll, attendedAll, overallPct, below75, above90 };
  }, [attendance]);

  // O(1) lookup: subject calendar logs by date
  const subjectLogMap = useMemo(() => {
    const map = new Map<string, AttendanceLogEntry>();
    for (const l of subjectCalLogs) map.set(l.date, l);
    return map;
  }, [subjectCalLogs]);

  // O(1) lookup: global calendar logs grouped by date
  const globalLogsByDate = useMemo(() => {
    const map = new Map<string, AttendanceLogEntry[]>();
    for (const l of calendarLogs) {
      if (!map.has(l.date)) map.set(l.date, []);
      map.get(l.date)!.push(l);
    }
    return map;
  }, [calendarLogs]);

  // Pre-computed global calendar grid
  const globalCalendarGrid = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: string; day: number; present: number; absent: number; total: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = ds(year, month, d);
      const dayLogs = globalLogsByDate.get(date) || [];
      const present = dayLogs.filter(l => l.status === 'present').length;
      const absent = dayLogs.filter(l => l.status === 'absent').length;
      days.push({ date, day: d, present, absent, total: present + absent });
    }
    return { days, firstDay };
  }, [calendarMonth, globalLogsByDate]);

  // Pre-computed subject calendar grid
  const subjectCalendarGrid = useMemo(() => {
    const { year, month } = subjectCalMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const presentCount = subjectCalLogs.filter(l => l.status === 'present').length;
    const absentCount = subjectCalLogs.filter(l => l.status === 'absent').length;
    const days: { date: string; day: number; status: 'present' | 'absent' | null }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = ds(year, month, d);
      const log = subjectLogMap.get(date);
      days.push({ date, day: d, status: log?.status || null });
    }
    return { days, firstDay, daysInMonth, presentCount, absentCount };
  }, [subjectCalMonth, subjectLogMap, subjectCalLogs]);

  // ── Data loading ──
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

  const loadCalendarLogs = useCallback(async () => {
    if (!user) return;
    setCalendarLoading(true);
    const { start, end } = getMonthRange(calendarMonth.year, calendarMonth.month);
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

  // Subject calendar loader — uses attendanceRef so it does NOT re-trigger when attendance changes
  const loadSubjectCalLogs = useCallback(async () => {
    if (!user || !subjectCalId) return;
    const record = attendanceRef.current.find(a => a.id === subjectCalId);
    if (!record) return;
    setSubjectCalLoading(true);
    const { start, end } = getMonthRange(subjectCalMonth.year, subjectCalMonth.month);
    try {
      const res = await fetch(`/api/attendance?userId=${user.id}&logs=true&start=${start}&end=${end}`);
      const data = await res.json();
      if (data.success) {
        const logs = (data.data || []).filter((l: AttendanceLogEntry) => l.subject === record.subject);
        setSubjectCalLogs(logs);
      }
    } catch (err) { console.error('loadSubjectCalLogs:', err); }
    setSubjectCalLoading(false);
  }, [user, subjectCalId, subjectCalMonth]);

  // ONLY fires on subjectCalId or subjectCalMonth change — NOT on attendance change
  useEffect(() => {
    if (subjectCalId && user) loadSubjectCalLogs();
  }, [subjectCalId, subjectCalMonth, user, loadSubjectCalLogs]);

  // ── Optimistic handlers ──
  const handleUpsert = useCallback(async (record: AttendanceRecord, attended: number, total: number, logStatus?: 'present' | 'absent') => {
    // Instant UI update
    setAttendance(prev =>
      prev.map(a => a.id === record.id
        ? { ...a, totalClasses: total, attendedClasses: attended, lastUpdated: new Date().toISOString() }
        : a
      )
    );
    // Update subject calendar if open for this subject
    if (subjectCalId === record.id && logStatus) {
      const t = new Date().toISOString().slice(0, 10);
      setSubjectCalLogs(prev => {
        const idx = prev.findIndex(l => l.date === t);
        if (idx >= 0) {
          const u = [...prev];
          u[idx] = { ...u[idx], status: logStatus };
          return u;
        }
        return [...prev, { id: `temp_${t}`, userId: record.userId, subject: record.subject, date: t, status: logStatus, createdAt: new Date().toISOString() }];
      });
    }
    // Background API call
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id, userId: record.userId, subject: record.subject,
          totalClasses: total, attendedClasses: attended,
          createdAt: record.createdAt, logStatus,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setAttendance(prev => prev.map(a => a.id === record.id ? record : a));
      } else if (showCalendarRef.current) {
        loadCalendarLogs();
      }
    } catch {
      setAttendance(prev => prev.map(a => a.id === record.id ? record : a));
    }
  }, [subjectCalId, loadCalendarLogs]);

  const handleToggleDay = useCallback(async (record: AttendanceRecord, dateStr: string) => {
    if (!user) return;
    if (pendingDays.current.has(dateStr)) return;
    pendingDays.current.add(dateStr);

    const existing = subjectLogMap.get(dateStr);
    const prevStatus = existing?.status || null;

    let action: 'present' | 'absent' | 'remove';
    if (!prevStatus) action = 'present';
    else if (prevStatus === 'present') action = 'absent';
    else action = 'remove';

    let totalDelta = 0, attendedDelta = 0;
    if (action === 'remove') {
      if (prevStatus === 'present') { totalDelta = -1; attendedDelta = -1; }
      else if (prevStatus === 'absent') { totalDelta = -1; }
    } else if (!prevStatus) {
      totalDelta = 1;
      attendedDelta = action === 'present' ? 1 : 0;
    } else if (prevStatus === 'present' && action === 'absent') {
      attendedDelta = -1;
    } else if (prevStatus === 'absent' && action === 'present') {
      attendedDelta = 1;
    }

    // Snapshot for rollback
    const prevLogs = [...subjectCalLogs];
    const prevRecord = attendanceRef.current.find(a => a.id === record.id)!;

    // INSTANT UI update
    if (action === 'remove') {
      setSubjectCalLogs(prev => prev.filter(l => l.date !== dateStr));
    } else {
      setSubjectCalLogs(prev => {
        const idx = prev.findIndex(l => l.date === dateStr);
        if (idx >= 0) {
          const u = [...prev];
          u[idx] = { ...u[idx], status: action as 'present' | 'absent' };
          return u;
        }
        return [...prev, { id: `temp_${dateStr}`, userId: user.id, subject: record.subject, date: dateStr, status: action as 'present' | 'absent', createdAt: new Date().toISOString() }];
      });
    }
    setAttendance(prev =>
      prev.map(a => a.id === record.id
        ? { ...a, totalClasses: Math.max(0, a.totalClasses + totalDelta), attendedClasses: Math.max(0, a.attendedClasses + attendedDelta), lastUpdated: new Date().toISOString() }
        : a
      )
    );

    // Background API
    try {
      const res = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: record.id, userId: user.id, subject: record.subject, date: dateStr, action }),
      });
      const data = await res.json();
      if (!data.success) {
        setSubjectCalLogs(prevLogs);
        setAttendance(prev => prev.map(a => a.id === record.id ? prevRecord : a));
      } else if (showCalendarRef.current) {
        loadCalendarLogs();
      }
    } catch {
      setSubjectCalLogs(prevLogs);
      setAttendance(prev => prev.map(a => a.id === record.id ? prevRecord : a));
    } finally {
      pendingDays.current.delete(dateStr);
    }
  }, [user, subjectLogMap, subjectCalLogs, loadCalendarLogs]);

  const handleAddSubject = useCallback(async () => {
    if (!newSubject.trim() || !user) return;
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, subject: newSubject.trim(), totalClasses: 0, attendedClasses: 0 }),
      });
      const data = await res.json();
      if (data.success) { await loadAttendance(); setNewSubject(''); setShowAddSubject(false); }
    } catch (err) { console.error('addSubject:', err); }
  }, [user, newSubject, loadAttendance]);

  const handleBulkAdd = useCallback(async () => {
    if (!bulkText.trim() || !user) return;
    const subjects = bulkText.split('\n').map(s => s.trim()).filter(Boolean);
    const newSubjects = subjects.filter(s => !attendance.some(a => a.subject.toLowerCase() === s.toLowerCase()));
    if (newSubjects.length === 0) { setBulkText(''); setShowBulkAdd(false); return; }
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, subjects: newSubjects }),
    });
    await loadAttendance();
    setBulkText('');
    setShowBulkAdd(false);
  }, [user, bulkText, attendance, loadAttendance]);

  const handleDelete = useCallback(async (id: string) => {
    const prev = [...attendance];
    setAttendance(p => p.filter(a => a.id !== id));
    try {
      const res = await fetch('/api/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) setAttendance(prev);
    } catch { setAttendance(prev); }
  }, [attendance]);

  // ── Calendar nav helpers ──
  const toggleSubjectCal = useCallback((recordId: string) => {
    if (subjectCalId === recordId) {
      setSubjectCalId(null);
      setSubjectCalLogs([]);
    } else {
      setSubjectCalId(recordId);
      const now = new Date();
      setSubjectCalMonth({ year: now.getFullYear(), month: now.getMonth() });
    }
  }, [subjectCalId]);

  const navMonth = useCallback((setter: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>, dir: 1 | -1) => {
    setter(prev => {
      const m = prev.month + dir;
      if (m < 0) return { year: prev.year - 1, month: 11 };
      if (m > 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: m };
    });
  }, []);

  // ── Render ──
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
        <p className="text-sm text-[var(--muted)]">Please log in to track attendance</p>
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
          <button onClick={() => { setShowBulkAdd(!showBulkAdd); setShowAddSubject(false); }} className="btn-secondary text-xs">
            📋 Bulk Add
          </button>
          <button onClick={() => { setShowAddSubject(!showAddSubject); setShowBulkAdd(false); }} className="btn-primary text-xs">
            + Add Subject
          </button>
        </div>
      </div>

      {/* Overall Stats */}
      {attendance.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Overall</p>
            <p className={`text-lg font-bold ${stats.overallPct >= 75 ? 'text-green-400' : stats.overallPct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {stats.overallPct}%
            </p>
            <p className="text-[10px] text-[var(--muted)]">{stats.attendedAll}/{stats.totalAll} classes</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Subjects</p>
            <p className="text-lg font-bold">{attendance.length}</p>
            <p className="text-[10px] text-[var(--muted)]">Total tracked</p>
          </div>
          <div className="card p-3 border-red-500/20">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">⚠️ Below 75%</p>
            <p className="text-lg font-bold text-red-400">{stats.below75}</p>
            <p className="text-[10px] text-[var(--muted)]">Need attention</p>
          </div>
          <div className="card p-3 border-green-500/20">
            <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">🌟 Above 90%</p>
            <p className="text-lg font-bold text-green-400">{stats.above90}</p>
            <p className="text-[10px] text-[var(--muted)]">Excellent!</p>
          </div>
        </div>
      )}

      {/* Expandable Global Calendar */}
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
            <span className={`text-xs transition-transform duration-300 ${showCalendar ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* Smooth slide — always in DOM, controlled by max-height */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showCalendar ? 'max-h-[700px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => { navMonth(setCalendarMonth, -1); setSelectedDay(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90">◀</button>
                <h3 className="text-sm font-bold">{MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}</h3>
                <button onClick={() => { navMonth(setCalendarMonth, 1); setSelectedDay(null); }} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90">▶</button>
              </div>

              {calendarLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {DAY_HEADERS_FULL.map(d => (
                      <div key={d} className="text-center text-[9px] text-[var(--muted)] font-medium py-1">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: globalCalendarGrid.firstDay }, (_, i) => <div key={`e-${i}`} className="min-h-[36px]" />)}
                    {globalCalendarGrid.days.map(d => {
                      const isToday = d.date === today;
                      const isSelected = selectedDay === d.date;
                      let dotColor = '';
                      if (d.total > 0) {
                        const ratio = d.present / d.total;
                        dotColor = ratio >= 0.75 ? 'bg-green-500' : ratio >= 0.5 ? 'bg-amber-500' : 'bg-red-500';
                      }
                      return (
                        <button
                          key={d.date}
                          onClick={() => setSelectedDay(isSelected ? null : d.date)}
                          className={`relative flex flex-col items-center justify-center p-1 rounded-lg text-[11px] transition-all duration-150 min-h-[36px] active:scale-90 ${
                            isSelected ? 'bg-[var(--primary)]/20 ring-1 ring-[var(--primary)]' :
                            isToday ? 'bg-white/10 font-bold' : 'hover:bg-white/5'
                          }`}
                        >
                          <span className={isToday ? 'text-[var(--primary-light)]' : ''}>{d.day}</span>
                          {d.total > 0 && <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-0.5`} />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
                    {[
                      { color: 'bg-green-500', label: '≥75%' },
                      { color: 'bg-amber-500', label: '50-74%' },
                      { color: 'bg-red-500', label: '<50%' },
                      { color: 'bg-white/20', label: 'No data' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${l.color}`} />
                        <span className="text-[9px] text-[var(--muted)]">{l.label}</span>
                      </div>
                    ))}
                  </div>

                  {selectedDay && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <h4 className="text-xs font-semibold mb-2">
                        📋 {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </h4>
                      {(() => {
                        const dayLogs = globalLogsByDate.get(selectedDay) || [];
                        if (dayLogs.length === 0) return <p className="text-[10px] text-[var(--muted)]">No attendance recorded this day</p>;
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
          </div>
        </div>
      )}

      {/* Add Subject Form */}
      {showAddSubject && (
        <div className="card p-4 mb-4 fade-in">
          <h3 className="text-sm font-semibold mb-3">Add New Subject</h3>
          <div className="flex gap-2">
            <input
              type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
              placeholder="e.g. Data Structures, Operating Systems..."
              className="input-field text-sm flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()} autoFocus
            />
            <button onClick={handleAddSubject} className="btn-primary text-xs px-4">Add</button>
          </div>
        </div>
      )}

      {/* Bulk Add Form */}
      {showBulkAdd && (
        <div className="card p-4 mb-4 fade-in">
          <h3 className="text-sm font-semibold mb-2">Bulk Add Subjects</h3>
          <p className="text-[10px] text-[var(--muted)] mb-3">Enter one subject per line</p>
          <textarea
            value={bulkText} onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Data Structures\nOperating Systems\nComputer Networks\nDBMS\nDiscrete Mathematics"}
            className="input-field text-sm w-full h-32 resize-none" autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setShowBulkAdd(false)} className="btn-secondary text-xs">Cancel</button>
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
          <button onClick={() => setShowAddSubject(true)} className="btn-primary text-xs">+ Add Your First Subject</button>
        </div>
      ) : (
        <div className="space-y-3">
          {attendance.map((a) => {
            const pct = a.totalClasses > 0 ? Math.round((a.attendedClasses / a.totalClasses) * 100) : 0;
            const isEditing = editingId === a.id;
            const isCalOpen = subjectCalId === a.id;
            const colorClass = pct >= 75 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : pct > 0 ? 'bg-red-500' : 'bg-white/20';
            const textColor = pct >= 75 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : pct > 0 ? 'text-red-400' : 'text-[var(--muted)]';
            const bgTint = pct >= 75 ? 'border-green-500/10' : pct >= 60 ? 'border-amber-500/10' : pct > 0 ? 'border-red-500/10' : '';

            let classesNeeded = '';
            if (a.totalClasses > 0 && pct < 75) {
              const x = Math.ceil((0.75 * a.totalClasses - a.attendedClasses) / 0.25);
              if (x > 0) classesNeeded = `Attend next ${x} classes to reach 75%`;
            }
            let canSkip = '';
            if (a.totalClasses > 0 && pct > 75) {
              const x = Math.floor(a.attendedClasses / 0.75 - a.totalClasses);
              if (x > 0) canSkip = `Can skip ${x} class${x > 1 ? 'es' : ''} safely`;
            }

            return (
              <div key={a.id} className={`card p-4 transition-all duration-200 ${bgTint}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Subject Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold truncate">{a.subject}</h3>
                      <span className={`text-xs font-bold ${textColor}`}>{a.totalClasses > 0 ? `${pct}%` : 'N/A'}</span>
                      {pct >= 90 && <span className="text-[10px]">🌟</span>}
                      {pct > 0 && pct < 75 && <span className="text-[10px]">⚠️</span>}
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-1.5">
                      <div className={`h-full rounded-full transition-all duration-300 ${colorClass}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] text-[var(--muted)]">{a.attendedClasses}/{a.totalClasses} classes attended</span>
                      {classesNeeded && <span className="text-[10px] text-red-400">📌 {classesNeeded}</span>}
                      {canSkip && <span className="text-[10px] text-green-400">✅ {canSkip}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isEditing ? (
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <button
                        onClick={() => handleUpsert(a, a.attendedClasses + 1, a.totalClasses + 1, 'present')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 active:bg-green-500/35 transition-all duration-150 active:scale-95 font-medium"
                      >✓ Present</button>
                      <button
                        onClick={() => handleUpsert(a, a.attendedClasses, a.totalClasses + 1, 'absent')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 active:bg-red-500/35 transition-all duration-150 active:scale-95 font-medium"
                      >✗ Absent</button>
                      <button
                        onClick={() => toggleSubjectCal(a.id)}
                        className={`text-xs px-2 py-1.5 rounded-lg transition-all duration-150 active:scale-95 ${
                          isCalOpen ? 'bg-[var(--primary)]/20 text-[var(--primary-light)]' : 'hover:bg-white/10 text-[var(--muted)]'
                        }`}
                        title="Day-wise calendar"
                      >📅</button>
                      <button
                        onClick={() => { setEditingId(a.id); setEditTotal(a.totalClasses); setEditAttended(a.attendedClasses); }}
                        className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] transition-all duration-150 active:scale-95"
                        title="Edit manually"
                      >✏️</button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-xs px-2 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition-all duration-150 active:scale-95"
                        title="Remove subject"
                      >🗑</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0 p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-[var(--muted)]">Attended:</label>
                        <input type="number" min={0} max={editTotal} value={editAttended}
                          onChange={(e) => setEditAttended(Math.max(0, parseInt(e.target.value) || 0))}
                          className="input-field text-xs w-16 text-center py-1" />
                      </div>
                      <span className="text-xs text-[var(--muted)]">/</span>
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-[var(--muted)]">Total:</label>
                        <input type="number" min={0} value={editTotal}
                          onChange={(e) => setEditTotal(Math.max(0, parseInt(e.target.value) || 0))}
                          className="input-field text-xs w-16 text-center py-1" />
                      </div>
                      <button
                        onClick={() => { handleUpsert(a, Math.min(editAttended, editTotal), editTotal); setEditingId(null); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)]/20 text-[var(--primary-light)] hover:bg-[var(--primary)]/30 transition-all font-medium"
                      >Save</button>
                      <button onClick={() => setEditingId(null)}
                        className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/10 text-[var(--muted)] transition-all">✕</button>
                    </div>
                  )}
                </div>

                {/* Per-subject inline calendar — smooth CSS slide */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCalOpen ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  <div className="pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => navMonth(setSubjectCalMonth, -1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90 text-[var(--muted)]">◀</button>
                      <div className="text-center">
                        <h4 className="text-xs font-bold tracking-wide">
                          {MONTH_NAMES[subjectCalMonth.month]} {subjectCalMonth.year}
                        </h4>
                        {!subjectCalLoading && isCalOpen && (
                          <p className="text-[9px] text-[var(--muted)] mt-0.5">
                            <span className="text-green-400 font-medium">{subjectCalendarGrid.presentCount}P</span>
                            {' · '}
                            <span className="text-red-400 font-medium">{subjectCalendarGrid.absentCount}A</span>
                            {' · '}
                            <span>{subjectCalendarGrid.daysInMonth - subjectCalendarGrid.presentCount - subjectCalendarGrid.absentCount} unmarked</span>
                          </p>
                        )}
                      </div>
                      <button onClick={() => navMonth(setSubjectCalMonth, 1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-all active:scale-90 text-[var(--muted)]">▶</button>
                    </div>

                    {subjectCalLoading ? (
                      <div className="flex justify-center py-6">
                        <div className="w-5 h-5 border-2 border-[var(--primary)]/30 border-t-[var(--primary)] rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-7 gap-[3px] mb-[3px]">
                          {DAY_HEADERS_SHORT.map((d, i) => (
                            <div key={`sh-${i}`} className="text-center text-[9px] text-[var(--muted)] font-semibold py-1">{d}</div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-[3px]">
                          {Array.from({ length: subjectCalendarGrid.firstDay }, (_, i) => <div key={`sp-${i}`} className="min-h-[34px]" />)}
                          {subjectCalendarGrid.days.map(d => {
                            const isToday2 = d.date === today;
                            const isFuture = d.date > today;

                            let cellBg = 'bg-white/[0.04] hover:bg-white/10';
                            let cellText = '';
                            let cellRing = '';
                            let icon = '';
                            if (d.status === 'present') {
                              cellBg = 'bg-green-500/20 hover:bg-green-500/30';
                              cellText = 'text-green-300 font-semibold';
                              cellRing = 'ring-1 ring-green-500/30';
                              icon = '✓';
                            } else if (d.status === 'absent') {
                              cellBg = 'bg-red-500/20 hover:bg-red-500/30';
                              cellText = 'text-red-300 font-semibold';
                              cellRing = 'ring-1 ring-red-500/30';
                              icon = '✗';
                            }

                            return (
                              <button
                                key={d.date}
                                onClick={() => !isFuture && handleToggleDay(a, d.date)}
                                disabled={isFuture}
                                className={`relative flex flex-col items-center justify-center rounded-lg min-h-[34px] transition-all duration-150
                                  ${isFuture ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer active:scale-90'}
                                  ${cellBg} ${cellText} ${cellRing}
                                  ${isToday2 ? 'ring-2 ring-[var(--primary)]/50' : ''}
                                `}
                              >
                                <span className={`text-[11px] leading-none ${isToday2 && !d.status ? 'text-[var(--primary-light)] font-bold' : ''}`}>{d.day}</span>
                                {icon && <span className="text-[7px] leading-none mt-[1px]">{icon}</span>}
                              </button>
                            );
                          })}
                        </div>

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
                            <span className="w-3 h-3 rounded bg-white/[0.04]" />
                            <span className="text-[9px] text-[var(--muted)]">Empty</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-center text-[var(--muted)] mt-1 opacity-60">Tap: empty → present → absent → clear</p>
                      </>
                    )}
                  </div>
                </div>
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
