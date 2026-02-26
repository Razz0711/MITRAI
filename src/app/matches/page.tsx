// ============================================
// MitrAI - Matches Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MatchCard from '@/components/MatchCard';
import { MatchResult, StudentProfile } from '@/lib/types';

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    loadStudents();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Find Your <span className="gradient-text">Study Buddy</span> 🤝
        </h1>
        <p className="text-[var(--muted)]">AI-powered matching across 5 dimensions</p>
      </div>

      {/* Controls */}
      <div className="glass-card p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="text-sm text-[var(--muted)] mb-1 block">Select Student Profile</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="input-field"
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
            className="btn-primary whitespace-nowrap mt-5 sm:mt-0"
          >
            {loading ? '🔍 Finding...' : '🧠 Find Matches'}
          </button>
        </div>

        {student && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 flex flex-wrap gap-4 text-sm">
            <span><strong>Student:</strong> {student.name}</span>
            <span><strong>Target:</strong> {student.targetExam}</span>
            <span><strong>Strong:</strong> {student.strongSubjects.join(', ')}</span>
            <span><strong>Weak:</strong> {student.weakSubjects.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-sm mb-6">
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-3xl animate-pulse">
            🧠
          </div>
          <p className="text-[var(--muted)]">AI agents are analyzing compatibility...</p>
          <p className="text-xs text-[var(--muted)] mt-2">Scoring across subject, schedule, style, goals & personality</p>
        </div>
      )}

      {/* Results */}
      {matches.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Top Matches</h2>
            <span className="text-sm text-[var(--muted)]">{matches.length} matches found</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {matches.map((match, index) => (
              <MatchCard
                key={match.student.id}
                match={match}
                rank={index + 1}
                onConnect={() => {
                  localStorage.setItem('mitrai_buddy_id', match.student.id);
                  localStorage.setItem('mitrai_buddy_name', match.student.name);
                  alert(`🎉 Connection request sent to ${match.student.name}! Check the Study Plan page to create a plan together.`);
                }}
                onViewProfile={() => {
                  alert(`📋 ${match.student.name}\n\nStudying: ${match.student.currentStudy}\nTarget: ${match.student.targetExam}\nStrong: ${match.student.strongSubjects.join(', ')}\nWeak: ${match.student.weakSubjects.join(', ')}\nSchedule: ${match.student.availableDays.join(', ')} ${match.student.availableTimes}\nGoal: ${match.student.shortTermGoal}`);
                }}
              />
            ))}
          </div>

          {/* Best Match Recommendation */}
          {matches[0] && (
            <div className="mt-8 glass-card p-6 text-center pulse-glow">
              <h3 className="text-xl font-bold mb-2">🏆 Our Recommendation</h3>
              <p className="text-[var(--muted)] mb-4">
                <strong className="text-[var(--foreground)]">{matches[0].student.name}</strong> is your best match with a{' '}
                <strong className="gradient-text">{matches[0].score.overall}%</strong> compatibility score.
                {matches[0].complementaryFactors.length > 0 && (
                  <> Their strengths perfectly complement your weaknesses!</>
                )}
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/study-plan" className="btn-primary text-sm">
                  📚 Create Study Plan Together
                </Link>
                <Link href="/session" className="btn-secondary text-sm">
                  💬 Start a Session
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && matches.length === 0 && !error && (
        <div className="text-center py-16 glass-card">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-2">Ready to Find Matches?</h2>
          <p className="text-[var(--muted)] mb-6 max-w-md mx-auto">
            Select a student profile above and click &quot;Find Matches&quot; to discover compatible study buddies.
          </p>
        </div>
      )}
    </div>
  );
}
