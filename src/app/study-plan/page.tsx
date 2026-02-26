// ============================================
// MitrAI - Study Plan Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { StudentProfile } from '@/lib/types';

export default function StudyPlanPage() {
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [studentId, setStudentId] = useState('');
  const [buddyId, setBuddyId] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setAllStudents(data.data);

        // Auto-select from localStorage
        const savedStudent = localStorage.getItem('mitrai_student_id');
        const savedBuddy = localStorage.getItem('mitrai_buddy_id');

        if (savedStudent) setStudentId(savedStudent);
        else if (data.data.length > 0) setStudentId(data.data[0].id);

        if (savedBuddy) setBuddyId(savedBuddy);
        else if (data.data.length > 1) setBuddyId(data.data[1].id);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const generatePlan = async () => {
    if (!studentId || !buddyId) return;
    setLoading(true);
    setPlan('');

    try {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const weekDates = `${today.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${nextWeek.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, buddyId, weekDates }),
      });

      const data = await res.json();
      if (data.success) {
        setPlan(data.data.plan);
      }
    } catch (err) {
      console.error('Plan generation error:', err);
      setPlan('Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const studentName = allStudents.find(s => s.id === studentId)?.name || '';
  const buddyName = allStudents.find(s => s.id === buddyId)?.name || '';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-1">
          <span className="gradient-text">AI Study Plan</span> Generator
        </h1>
        <p className="text-xs text-[var(--muted)]">Personalized weekly plans powered by Gemini AI</p>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Your Profile</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="input-field"
            >
              <option value="">Select student...</option>
              {allStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.targetExam}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Study Buddy</label>
            <select
              value={buddyId}
              onChange={(e) => setBuddyId(e.target.value)}
              className="input-field"
            >
              <option value="">Select buddy...</option>
              {allStudents.filter(s => s.id !== studentId).map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.targetExam}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generatePlan}
          disabled={!studentId || !buddyId || loading}
          className="btn-primary w-full text-xs"
        >
          {loading ? 'Generating...' : 'Generate Weekly Study Plan'}
        </button>

        {studentName && buddyName && (
          <p className="text-center text-sm text-[var(--muted)] mt-3">
            Creating a study plan for <strong className="text-[var(--foreground)]">{studentName}</strong> with buddy <strong className="text-[var(--foreground)]">{buddyName}</strong>
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 card">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center animate-pulse">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
          </div>
          <p className="text-xs text-[var(--muted)]">AI is creating your study plan...</p>
          <p className="text-[10px] text-[var(--muted)] mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Plan Display */}
      {plan && !loading && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold gradient-text">Your Study Plan</h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(plan);
                alert('Plan copied to clipboard');
              }}
              className="btn-secondary text-xs px-3 py-1"
            >
              Copy
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)] bg-transparent p-0 m-0 font-sans">
              {plan}
            </pre>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!plan && !loading && (
        <div className="text-center py-12 card">
          <h2 className="text-sm font-bold mb-1">Ready to Plan Your Week?</h2>
          <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
            Select yourself and a study buddy, then generate an AI-powered plan.
          </p>
        </div>
      )}
    </div>
  );
}
