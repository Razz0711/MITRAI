// ============================================
// MitrAI - Matches Page (with Status & Birthday indicators)
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import MatchCard from '@/components/MatchCard';
import { MatchResult, StudentProfile, UserStatus, BirthdayInfo } from '@/lib/types';

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Status & birthday data
  const [statusMap, setStatusMap] = useState<Record<string, UserStatus>>({});
  const [birthdayUserIds, setBirthdayUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadStudents();
    loadStatuses();
    loadBirthdays();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatuses = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const map: Record<string, UserStatus> = {};
        data.data.forEach((s: UserStatus) => { map[s.userId] = s; });
        setStatusMap(map);
      }
    } catch { /* ignore */ }
  };

  const loadBirthdays = useCallback(async () => {
    try {
      const usersRaw = localStorage.getItem('mitrai_users') || '[]';
      const users = JSON.parse(usersRaw).map((u: { id: string; name: string; department: string; dob: string; showBirthday?: boolean }) => ({
        id: u.id, name: u.name, department: u.department || '', dob: u.dob || '', showBirthday: u.showBirthday !== false,
      }));
      const params = new URLSearchParams({ days: '3', users: encodeURIComponent(JSON.stringify(users)) });
      const res = await fetch(`/api/birthday?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        const ids = new Set<string>((data.data.birthdays || []).map((b: BirthdayInfo) => b.userId));
        setBirthdayUserIds(ids);
      }
    } catch { /* ignore */ }
  }, []);

  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setAllStudents(data.data);
        const savedId = localStorage.getItem('mitrai_student_id');
        if (savedId) {
          setSelectedStudentId(savedId);
        } else if (data.data.length > 0) {
          setSelectedStudentId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const findMatches = async () => {
    if (!selectedStudentId) return;

    setLoading(true);
    setError('');
    setMatches([]);

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId }),
      });

      const data = await res.json();

      if (data.success) {
        setStudent(data.data.student);
        setMatches(data.data.matches);
      } else {
        setError(data.error || 'Failed to find matches');
      }
    } catch (err) {
      console.error('Match error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-1">
          Find Your <span className="gradient-text">Study Buddy</span>
        </h1>
        <p className="text-xs text-[var(--muted)]">AI-powered matching across 5 dimensions</p>
      </div>

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="label">Student Profile</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="input-field text-xs"
            >
              <option value="">Choose a student...</option>
              {allStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.targetExam} ({s.city})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={findMatches}
            disabled={!selectedStudentId || loading}
            className="btn-primary whitespace-nowrap mt-4 sm:mt-0 text-xs"
          >
            {loading ? 'Finding...' : 'Find Matches'}
          </button>
        </div>

        {student && (
          <div className="mt-3 p-3 rounded-lg bg-white/5 flex flex-wrap gap-3 text-xs">
            <span><strong>Student:</strong> {student.name}</span>
            <span><strong>Target:</strong> {student.targetExam}</span>
            <span><strong>Strong:</strong> {student.strongSubjects.join(', ')}</span>
            <span><strong>Weak:</strong> {student.weakSubjects.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-xs mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center animate-pulse">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
          </div>
          <p className="text-xs text-[var(--muted)]">Analyzing compatibility...</p>
          <p className="text-[10px] text-[var(--muted)] mt-1">Scoring across subject, schedule, style, goals & personality</p>
        </div>
      )}

      {/* Results */}
      {matches.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold">Top Matches</h2>
            <span className="text-xs text-[var(--muted)]">{matches.length} found</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {matches.map((match, index) => (
              <MatchCard
                key={match.student.id}
                match={match}
                rank={index + 1}
                userStatus={statusMap[match.student.id]}
                isBirthday={birthdayUserIds.has(match.student.id)}
                onConnect={() => {
                  localStorage.setItem('mitrai_buddy_id', match.student.id);
                  localStorage.setItem('mitrai_buddy_name', match.student.name);
                  alert(`Connection request sent to ${match.student.name}. Check the Study Plan page to create a plan together.`);
                }}
                onViewProfile={() => {
                  alert(`${match.student.name}\n\nStudying: ${match.student.currentStudy}\nTarget: ${match.student.targetExam}\nStrong: ${match.student.strongSubjects.join(', ')}\nWeak: ${match.student.weakSubjects.join(', ')}\nSchedule: ${match.student.availableDays.join(', ')} ${match.student.availableTimes}\nGoal: ${match.student.shortTermGoal}`);
                }}
              />
            ))}
          </div>

          {/* Best Match Recommendation */}
          {matches[0] && (
            <div className="mt-6 card p-4 text-center">
              <h3 className="text-sm font-bold mb-1">Our Recommendation</h3>
              <p className="text-xs text-[var(--muted)] mb-3">
                <strong className="text-[var(--foreground)]">{matches[0].student.name}</strong> is your best match with a{' '}
                <strong className="gradient-text">{matches[0].score.overall}%</strong> compatibility score.
                {matches[0].complementaryFactors.length > 0 && (
                  <> Their strengths complement your weaknesses.</>
                )}
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/study-plan" className="btn-primary text-xs">
                  Create Study Plan
                </Link>
                <Link href="/session" className="btn-secondary text-xs">
                  Start Session
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && matches.length === 0 && !error && (
        <div className="text-center py-12 card">
          <h2 className="text-sm font-bold mb-1">Ready to Find Matches?</h2>
          <p className="text-xs text-[var(--muted)] max-w-sm mx-auto">
            Select a student profile above and click &quot;Find Matches&quot; to discover compatible study buddies.
          </p>
        </div>
      )}
    </div>
  );
}
