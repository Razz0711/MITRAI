// ============================================
// MitrAI - Attendance Tracker Page
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { AttendanceRecord } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';

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

  const loadAttendance = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/attendance?userId=${user.id}`);
      const data = await res.json();
      if (data.success) setAttendance(data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadAttendance();
    else setLoading(false);
  }, [user, loadAttendance]);

  const handleUpsert = async (record: AttendanceRecord, attended: number, total: number) => {
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAttendance(prev =>
          prev.map(a =>
            a.id === record.id
              ? { ...a, totalClasses: total, attendedClasses: attended, lastUpdated: new Date().toISOString() }
              : a
          )
        );
      }
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
  };

  // Stats
  const totalAll = attendance.reduce((s, a) => s + a.totalClasses, 0);
  const attendedAll = attendance.reduce((s, a) => s + a.attendedClasses, 0);
  const overallPct = totalAll > 0 ? Math.round((attendedAll / totalAll) * 100) : 0;
  const subjectsBelow75 = attendance.filter(a => a.totalClasses > 0 && (a.attendedClasses / a.totalClasses) < 0.75);
  const subjectsAbove90 = attendance.filter(a => a.totalClasses > 0 && (a.attendedClasses / a.totalClasses) >= 0.9);

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
                        onClick={() => handleUpsert(a, a.attendedClasses + 1, a.totalClasses + 1)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors font-medium"
                        title="Mark as present"
                      >
                        ✓ Present
                      </button>
                      <button
                        onClick={() => handleUpsert(a, a.attendedClasses, a.totalClasses + 1)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors font-medium"
                        title="Mark as absent"
                      >
                        ✗ Absent
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
