// ============================================
// MitrAI - Dashboard Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { StudentProfile, Day } from '@/lib/types';

export default function DashboardPage() {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedId = localStorage.getItem('mitrai_student_id');

      const res = await fetch('/api/students');
      const data = await res.json();

      if (data.success) {
        setAllStudents(data.data);

        if (savedId) {
          const found = data.data.find((s: StudentProfile) => s.id === savedId);
          if (found) {
            setStudent(found);
            setSelectedStudentId(found.id);
          }
        }

        // If no saved student, use first demo student for demo purposes
        if (!savedId && data.data.length > 0) {
          setStudent(data.data[0]);
          setSelectedStudentId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (id: string) => {
    const found = allStudents.find(s => s.id === id);
    if (found) {
      setStudent(found);
      setSelectedStudentId(id);
      localStorage.setItem('mitrai_student_id', id);
      localStorage.setItem('mitrai_student_name', found.name);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center animate-pulse">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
          </div>
          <p className="text-xs text-[var(--muted)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold">
            Welcome back, <span className="gradient-text">{student?.name || 'Student'}</span>
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">Your study overview</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStudentId}
            onChange={(e) => handleStudentSelect(e.target.value)}
            className="input-field text-xs w-40"
          >
            {allStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Link href="/onboarding" className="btn-primary text-xs">
            + New
          </Link>
        </div>
      </div>

      {student ? (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Target Exam" value={student.targetExam} color="primary" />
            <StatCard label="Studying" value={student.currentlyStudying || 'Not set'} color="secondary" />
            <StatCard label="Daily Target" value={`${student.studyHoursTarget}h`} color="success" />
            <StatCard label="Sessions/Week" value={`${student.sessionsPerWeek}`} color="accent" />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Profile Card */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Profile</h2>
              <div className="space-y-3">
                <ProfileRow label="Name" value={student.name} />
                <ProfileRow label="Department" value={student.department || 'Not set'} />
                <ProfileRow label="Study" value={student.currentStudy} />
                <ProfileRow label="Year" value={student.yearLevel} />
                <ProfileRow label="Institution" value={student.institution || 'SVNIT Surat'} />
                <ProfileRow label="Location" value={`${student.city}, ${student.country}`} />
                <ProfileRow label="Exam Date" value={student.targetDate || 'Not set'} />
              </div>
            </div>

            {/* Subjects Card */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Subjects</h2>

              <div className="mb-3">
                <p className="text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-wide">Strong</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.strongSubjects.map(s => (
                    <span key={s} className="badge-success text-xs">{s}</span>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-wide">Needs Work</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.weakSubjects.map(s => (
                    <span key={s} className="badge-warning text-xs">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[var(--muted)] mb-1.5 uppercase tracking-wide">Methods</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.studyMethod.map(m => (
                    <span key={m} className="badge-primary text-xs">{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Goals Card */}
            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Goals</h2>
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                  <p className="text-xs text-[var(--primary-light)] mb-1">Short Term</p>
                  <p className="text-sm font-medium">{student.shortTermGoal || 'Not set'}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20">
                  <p className="text-xs text-[var(--secondary)] mb-1">Long Term</p>
                  <p className="text-sm font-medium">{student.longTermGoal || 'Not set'}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5">
                  <p className="text-xs text-[var(--muted)] mb-1">Weekly Goals</p>
                  <p className="text-sm font-medium">{student.weeklyGoals || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule & Study Style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Schedule</h2>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const fullDays: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  const isAvailable = student.availableDays.includes(fullDays[i]);
                  return (
                    <div
                      key={day}
                      className={`text-center py-2 rounded-lg text-xs font-medium ${
                        isAvailable
                          ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30'
                          : 'bg-white/5 text-[var(--muted)]'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <ProfileRow label="Time" value={student.availableTimes} />
                <ProfileRow label="Sessions/Week" value={`${student.sessionsPerWeek}`} />
                <ProfileRow label="Session Type" value={student.sessionType} />
              </div>
            </div>

            <div className="card p-4">
              <h2 className="text-sm font-semibold mb-3">Study Style</h2>
              <div className="space-y-2">
                <ProfileRow label="Learning Type" value={student.learningType} />
                <ProfileRow label="Session Length" value={student.sessionLength} />
                <ProfileRow label="Break Pattern" value={student.breakPattern} />
                <ProfileRow label="Pace" value={student.pace} />
                <ProfileRow label="Study Style" value={student.studyStyle} />
                <ProfileRow label="Communication" value={student.communication} />
                <ProfileRow label="Teaching" value={student.teachingAbility} />
                <ProfileRow label="Accountability" value={student.accountabilityNeed} />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <Link href="/matches" className="card-hover p-4 text-center block">
              <h3 className="text-sm font-semibold mb-1">Find Matches</h3>
              <p className="text-xs text-[var(--muted)]">Discover compatible study buddies</p>
            </Link>
            <Link href="/study-plan" className="card-hover p-4 text-center block">
              <h3 className="text-sm font-semibold mb-1">Study Plan</h3>
              <p className="text-xs text-[var(--muted)]">Generate your weekly plan</p>
            </Link>
            <Link href="/session" className="card-hover p-4 text-center block">
              <h3 className="text-sm font-semibold mb-1">Start Session</h3>
              <p className="text-xs text-[var(--muted)]">Study with AI assistance</p>
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-lg font-bold mb-2">No Profile Yet</h2>
          <p className="text-xs text-[var(--muted)] mb-4">Complete onboarding to set up your study profile</p>
          <Link href="/onboarding" className="btn-primary text-sm">
            Start Onboarding
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    primary: 'border-[var(--primary)]/20',
    secondary: 'border-[var(--secondary)]/20',
    success: 'border-[var(--success)]/20',
    accent: 'border-[var(--accent)]/20',
  };

  return (
    <div className={`card p-3 ${colorClasses[color]}`}>
      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-[var(--border)]/50 last:border-0">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <span className="text-xs font-medium capitalize">{value}</span>
    </div>
  );
}
