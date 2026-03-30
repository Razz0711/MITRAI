// ============================================
// MitrRAI - Personality Test History
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { TRAIT_COLORS, TRAIT_LABELS } from '@/lib/personality-test';

interface ReportSummary {
  id: string;
  report_number: number;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  created_at: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/arya/personality?action=history')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) setReports(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen pb-24 page-enter" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="px-4 pt-4 flex items-center gap-3 mb-6" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors" style={{ background: 'var(--surface)' }}>
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-white font-heading">Past Reports</h1>
      </div>

      <div className="px-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && reports.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm text-[var(--muted)] mb-4">No reports yet</p>
            <button onClick={() => router.push('/arya/self-awareness-test')} className="btn-primary">
              Take the Test
            </button>
          </div>
        )}

        {reports.map((r, i) => {
          const date = new Date(r.created_at);
          const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const isLatest = i === 0;
          const scores = [
            { trait: 'openness', score: r.openness },
            { trait: 'conscientiousness', score: r.conscientiousness },
            { trait: 'extraversion', score: r.extraversion },
            { trait: 'agreeableness', score: r.agreeableness },
            { trait: 'neuroticism', score: r.neuroticism },
          ];

          return (
            <button
              key={r.id}
              onClick={() => router.push(`/arya/self-awareness-test/report?id=${r.id}`)}
              className="w-full text-left p-4 rounded-2xl transition-all active:scale-[0.98]"
              style={{
                background: 'var(--surface)',
                border: isLatest ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--glass-border)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-[var(--muted)]" />
                  <span className="text-xs text-[var(--muted)]">{dateStr}</span>
                  {isLatest && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                      Latest
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[var(--muted)]">
                  <span className="text-xs">Report #{r.report_number}</span>
                  <ChevronRight size={14} />
                </div>
              </div>

              {/* Mini score bars */}
              <div className="space-y-1.5">
                {scores.map(s => (
                  <div key={s.trait} className="flex items-center gap-2">
                    <span className="text-[10px] text-white/50 w-6">{TRAIT_LABELS[s.trait]?.slice(0, 1)}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-light)' }}>
                      <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: TRAIT_COLORS[s.trait] }} />
                    </div>
                    <span className="text-[10px] text-white/50 w-6 text-right">{s.score}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
