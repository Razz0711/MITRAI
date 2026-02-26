// ============================================
// MitrAI - Match Card Component
// ============================================

'use client';

import Link from 'next/link';
import { MatchResult } from '@/lib/types';

interface MatchCardProps {
  match: MatchResult;
  rank: number;
  onViewProfile?: () => void;
  onConnect?: () => void;
}

export default function MatchCard({ match, rank, onViewProfile, onConnect }: MatchCardProps) {
  const { student, score, whyItWorks, potentialChallenges, recommendedFirstTopic, bestFormat, complementaryFactors } = match;

  const rankColors: Record<number, string> = {
    1: 'from-yellow-500 to-amber-400',
    2: 'from-gray-300 to-gray-400',
    3: 'from-amber-600 to-amber-700',
  };

  const rankEmoji: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <div className="glass-card-hover p-6 slide-up" style={{ animationDelay: `${rank * 150}ms` }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rankColors[rank] || 'from-purple-500 to-blue-500'} flex items-center justify-center text-2xl`}>
            {rankEmoji[rank] || '⭐'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">{student.name}</h3>
            <p className="text-sm text-[var(--muted)]">{student.city}, {student.country} · {student.targetExam}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold gradient-text">{score.overall}%</div>
          <p className="text-xs text-[var(--muted)]">Match Score</p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <ScoreBar label="Subject" score={score.subject} max={30} />
        <ScoreBar label="Schedule" score={score.schedule} max={25} />
        <ScoreBar label="Style" score={score.style} max={20} />
        <ScoreBar label="Goals" score={score.goal} max={15} />
        <ScoreBar label="Personality" score={score.personality} max={10} />
      </div>

      {/* Info Sections */}
      <div className="space-y-3 mb-4">
        <div className="p-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20">
          <p className="text-xs font-semibold text-[var(--success)] mb-1">💡 Why This Works</p>
          <p className="text-sm text-[var(--foreground)]">{whyItWorks}</p>
        </div>

        {complementaryFactors.length > 0 && (
          <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20">
            <p className="text-xs font-semibold text-[var(--secondary)] mb-1">🔄 Complementary Strengths</p>
            <ul className="text-sm text-[var(--foreground)] space-y-1">
              {complementaryFactors.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-white/5">
            <p className="text-xs text-[var(--muted)] mb-1">📚 First Session Topic</p>
            <p className="text-sm font-medium">{recommendedFirstTopic}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <p className="text-xs text-[var(--muted)] mb-1">📋 Best Format</p>
            <p className="text-sm font-medium">{bestFormat}</p>
          </div>
        </div>

        {potentialChallenges && (
          <div className="p-3 rounded-xl bg-[var(--warning)]/10 border border-[var(--warning)]/20">
            <p className="text-xs font-semibold text-[var(--warning)] mb-1">⚠️ Potential Challenges</p>
            <p className="text-sm text-[var(--foreground)]">{potentialChallenges}</p>
          </div>
        )}
      </div>

      {/* Student Details */}
      <div className="p-3 rounded-xl bg-white/5 mb-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-[var(--muted)]">Strong:</span> <span className="text-[var(--success)]">{student.strongSubjects.join(', ')}</span></div>
          <div><span className="text-[var(--muted)]">Weak:</span> <span className="text-[var(--accent)]">{student.weakSubjects.join(', ')}</span></div>
          <div><span className="text-[var(--muted)]">Available:</span> {student.availableDays.slice(0, 3).join(', ')}</div>
          <div><span className="text-[var(--muted)]">Time:</span> {student.availableTimes}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={onConnect} className="btn-primary flex-1 text-sm">
          🤝 Connect
        </button>
        <button onClick={onViewProfile} className="btn-secondary flex-1 text-sm">
          👤 Profile
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <Link
          href={`/call?mode=voice&buddy=${encodeURIComponent(student.name)}`}
          className="flex-1 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center font-medium hover:bg-green-500/20 transition-all"
        >
          🎙️ Voice Call
        </Link>
        <Link
          href={`/call?mode=video&buddy=${encodeURIComponent(student.name)}`}
          className="flex-1 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm text-center font-medium hover:bg-blue-500/20 transition-all"
        >
          📹 Video Call
        </Link>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = Math.round((score / max) * 100);

  return (
    <div className="text-center">
      <div className="score-bar mb-1">
        <div className="score-fill" style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-[10px] text-[var(--muted)]">{label}</p>
      <p className="text-xs font-semibold">{score}/{max}</p>
    </div>
  );
}
