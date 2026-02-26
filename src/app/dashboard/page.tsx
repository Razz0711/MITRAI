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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-3xl animate-pulse">
            🧠
          </div>
          <p className="text-[var(--muted)]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, <span className="gradient-text">{student?.name || 'Student'}</span> 👋
          </h1>
          <p className="text-[var(--muted)] mt-1">Here&apos;s your study overview</p>
        </div>

        {/* Student Selector (for demo) */}
        <div className="flex items-center gap-3">
          <select
            value={selectedStudentId}
            onChange={(e) => handleStudentSelect(e.target.value)}
            className="input-field text-sm w-48"
          >
            {allStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Link href="/onboarding" className="btn-primary text-sm">
            + New Profile
          </Link>
        </div>
      </div>

      {student ? (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon="🎯" label="Target Exam" value={student.targetExam} color="primary" />
            <StatCard icon="📚" label="Currently Studying" value={student.currentlyStudying || 'Not set'} color="secondary" />
            <StatCard icon="⏰" label="Daily Target" value={`${student.studyHoursTarget}h`} color="success" />
            <StatCard icon="📅" label="Sessions/Week" value={`${student.sessionsPerWeek}`} color="accent" />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">👤</span> Your Profile
              </h2>
              <div className="space-y-3">
                <ProfileRow label="Name" value={student.name} />
                <ProfileRow label="Location" value={`${student.city}, ${student.country}`} />
                <ProfileRow label="Study" value={student.currentStudy} />
                <ProfileRow label="Year" value={student.yearLevel} />
                <ProfileRow label="Institution" value={student.institution || 'Not specified'} />
                <ProfileRow label="Language" value={student.preferredLanguage} />
                <ProfileRow label="Exam Date" value={student.targetDate || 'Not set'} />
              </div>
            </div>

            {/* Subjects Card */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">📖</span> Subjects
              </h2>

              <div className="mb-4">
                <p className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wide">Strong Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {student.strongSubjects.map(s => (
                    <span key={s} className="px-3 py-1 rounded-full bg-[var(--success)]/15 text-[var(--success)] text-sm border border-[var(--success)]/20">
                      ✅ {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wide">Needs Improvement</p>
                <div className="flex flex-wrap gap-2">
                  {student.weakSubjects.map(s => (
                    <span key={s} className="px-3 py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-sm border border-[var(--accent)]/20">
                      📝 {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wide">Study Methods</p>
                <div className="flex flex-wrap gap-2">
                  {student.studyMethod.map(m => (
                    <span key={m} className="px-3 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary-light)] text-sm border border-[var(--primary)]/20">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Goals Card */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">🎯</span> Goals
              </h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">📅</span> Schedule
              </h2>
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

            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">🧠</span> Study Style
              </h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <Link href="/matches" className="glass-card-hover p-6 text-center block">
              <div className="text-3xl mb-2">🤝</div>
              <h3 className="font-bold mb-1">Find Matches</h3>
              <p className="text-sm text-[var(--muted)]">Discover compatible study buddies</p>
            </Link>
            <Link href="/study-plan" className="glass-card-hover p-6 text-center block">
              <div className="text-3xl mb-2">📚</div>
              <h3 className="font-bold mb-1">Study Plan</h3>
              <p className="text-sm text-[var(--muted)]">Generate your weekly plan</p>
            </Link>
            <Link href="/session" className="glass-card-hover p-6 text-center block">
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-bold mb-1">Start Session</h3>
              <p className="text-sm text-[var(--muted)]">Study with AI assistance</p>
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎓</div>
          <h2 className="text-2xl font-bold mb-2">No Profile Yet</h2>
          <p className="text-[var(--muted)] mb-6">Complete the onboarding to set up your study profile</p>
          <Link href="/onboarding" className="btn-primary">
            🚀 Start Onboarding
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    primary: 'from-[var(--primary)]/20 to-[var(--primary)]/5 border-[var(--primary)]/20',
    secondary: 'from-[var(--secondary)]/20 to-[var(--secondary)]/5 border-[var(--secondary)]/20',
    success: 'from-[var(--success)]/20 to-[var(--success)]/5 border-[var(--success)]/20',
    accent: 'from-[var(--accent)]/20 to-[var(--accent)]/5 border-[var(--accent)]/20',
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color]} border`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[var(--border)]/50 last:border-0">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="text-sm font-medium capitalize">{value}</span>
    </div>
  );
}
