// ============================================
// MitrRAI - Personality Report Display
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Play, MessageSquare, ChevronRight, Trophy, AlertTriangle, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { TRAIT_COLORS, TRAIT_LABELS } from '@/lib/personality-test';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

const PILLAR_TABS = ['career', 'health', 'wealth', 'mindset', 'intellect', 'relationships'] as const;
const PILLAR_EMOJIS: Record<string, string> = { career: '💼', health: '🏃', wealth: '💰', mindset: '🧠', intellect: '📚', relationships: '❤️' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Report = any;

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [report, setReport] = useState<Report>(null);
  const [loading, setLoading] = useState(true);
  const [activePillar, setActivePillar] = useState<string>('career');
  const [error, setError] = useState<string | null>(null);
  const [isFemaleUser, setIsFemaleUser] = useState(false);

  useEffect(() => {
    try { setIsFemaleUser(localStorage.getItem('mitrrai_user_gender') === 'Female'); } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    const reportId = searchParams.get('id');
    const url = reportId
      ? `/api/arya/personality?action=latest&id=${reportId}`
      : '/api/arya/personality?action=latest';
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setReport(d.data);
        } else {
          setError('No report found. Take the test first!');
        }
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setLoading(false));
  }, [user, searchParams]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !report?.full_report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <p className="text-[var(--muted)] text-sm mb-4">{error || 'No report found'}</p>
        <button onClick={() => router.push('/arya/self-awareness-test')} className="btn-primary">Take the Test</button>
      </div>
    );
  }

  const r = report.full_report;
  const scores = {
    openness: report.openness,
    conscientiousness: report.conscientiousness,
    extraversion: report.extraversion,
    agreeableness: report.agreeableness,
    neuroticism: report.neuroticism,
  };

  const radarData = [
    { trait: 'O', value: scores.openness, fullMark: 100 },
    { trait: 'C', value: scores.conscientiousness, fullMark: 100 },
    { trait: 'E', value: scores.extraversion, fullMark: 100 },
    { trait: 'A', value: scores.agreeableness, fullMark: 100 },
    { trait: 'N', value: scores.neuroticism, fullMark: 100 },
  ];

  const userName = user.name?.split(' ')[0] || 'You';
  const dateStr = new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const daysTillRetake = (() => {
    const diff = 15 - Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000);
    return Math.max(0, diff);
  })();

  return (
    <div className="min-h-screen pb-32 page-enter" style={{ background: 'var(--background)' }}>
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-b-3xl" style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a78bfa 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-8 left-8 w-2 h-2 rounded-full bg-white animate-pulse" />
          <div className="absolute top-20 right-16 w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-12 left-1/3 w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="px-4 pt-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button onClick={() => router.push('/arya')} className="w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-8 text-center">
          <p className="text-white/70 text-xs font-medium mb-1">{dateStr}</p>
          <h1 className="text-2xl font-bold text-white mb-3 font-heading">{userName}&apos;s Personality Report</h1>
          {r.tagline && (
            <div className="mx-auto max-w-sm p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-sm text-white/90 italic leading-relaxed">&ldquo;{r.tagline}&rdquo;</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-6 -mt-2">
        {/* ── OCEAN Radar Chart ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3">OCEAN Profile</p>
          <div className="w-full" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="trait" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }} />
                <Radar name="Score" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: '#a78bfa', stroke: '#7c3aed', strokeWidth: 2 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Score labels below chart */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {Object.entries(scores).map(([trait, score]) => (
              <div key={trait} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: TRAIT_COLORS[trait] }} />
                <span className="text-white/60">{TRAIT_LABELS[trait]?.slice(0, 3)}</span>
                <span className="font-bold text-white/90">{score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5 Trait Cards ── */}
        {r.traits && Object.entries(r.traits).map(([trait, data]: [string, any]) => (
          <div key={trait} className="rounded-2xl p-5 overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderLeft: `3px solid ${TRAIT_COLORS[trait]}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: TRAIT_COLORS[trait] }} />
                <h3 className="text-sm font-bold text-white">{TRAIT_LABELS[trait]}</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${TRAIT_COLORS[trait]}20`, color: TRAIT_COLORS[trait] }}>
                {data.score ?? scores[trait as keyof typeof scores]}/100
              </span>
            </div>
            {data.subtitle && <p className="text-xs italic text-[var(--muted)] mb-3">{data.subtitle}</p>}
            {data.what_it_means && (
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">What it means</p>
                <p className="text-xs text-white/80 leading-relaxed">{data.what_it_means}</p>
              </div>
            )}
            {data.pitfall && (
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 mb-1">⚠️ Your Pitfall</p>
                <p className="text-xs text-white/80 leading-relaxed">{data.pitfall}</p>
              </div>
            )}
            {data.power_move && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-400/80 mb-1">⚡ Power Move</p>
                <p className="text-xs text-white/80 leading-relaxed">{data.power_move}</p>
              </div>
            )}
          </div>
        ))}

        {/* ── Archetype Section ── */}
        {r.archetype && (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(30,20,50,0.95), rgba(20,15,35,0.98))', border: '1px solid rgba(124,58,237,0.25)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400/70 mb-2">Your Psychological Archetype</p>
            <h2 className="text-2xl font-bold text-white mb-3 font-heading">{r.archetype.name}</h2>
            <p className="text-sm text-white/70 leading-relaxed mb-5">{r.archetype.description}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Zap size={16} className="text-green-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-green-400 mb-1">{r.archetype.superpower_title}</p>
                <p className="text-[11px] text-white/60 leading-relaxed">{r.archetype.superpower_desc}</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={16} className="text-red-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-red-400 mb-1">{r.archetype.kryptonite_title}</p>
                <p className="text-[11px] text-white/60 leading-relaxed">{r.archetype.kryptonite_desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Internal Dynamics ── */}
        {r.internal_dynamics && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] px-1">Internal Dynamics</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-green-400 px-1 flex items-center gap-1"><Trophy size={12} /> Strengths</p>
                {r.internal_dynamics.strengths?.map((s: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                    <p className="text-[11px] font-bold text-green-400 mb-0.5">{s.title}</p>
                    <p className="text-[10px] text-white/60 leading-relaxed">{s.description}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-400 px-1 flex items-center gap-1"><AlertTriangle size={12} /> Sabotages</p>
                {r.internal_dynamics.sabotages?.map((s: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p className="text-[11px] font-bold text-red-400 mb-0.5">{s.title}</p>
                    <p className="text-[10px] text-white/60 leading-relaxed">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 6 Pillars ── */}
        {r.pillars && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3">6 Life Pillars</p>
            {/* Tab bar */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4 pb-1">
              {PILLAR_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActivePillar(tab)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all"
                  style={{
                    background: activePillar === tab ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--surface-light)',
                    color: activePillar === tab ? '#fff' : 'var(--muted)',
                    border: activePillar === tab ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {PILLAR_EMOJIS[tab]} {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            {/* Tips */}
            <div className="space-y-2.5">
              {(r.pillars[activePillar] || []).map((tip: any, i: number) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold text-white mb-1">{tip.tip_title}</p>
                  <p className="text-[11px] text-white/60 leading-relaxed">{tip.tip_desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Recommendations ── */}
        {r.recommendations && (
          <div className="space-y-4">
            {/* Books */}
            {r.recommendations.books?.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3 flex items-center gap-1.5"><BookOpen size={12} /> Recommended Books</p>
                <div className="space-y-3">
                  {r.recommendations.books.map((b: any, i: number) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-10 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.15))', border: '1px solid var(--border)' }}>
                        📖
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{b.title}</p>
                        <p className="text-[11px] text-purple-400">{b.author}</p>
                        <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{b.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Videos */}
            {r.recommendations.videos?.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3 flex items-center gap-1.5"><Play size={12} /> Recommended Videos</p>
                <div className="space-y-3">
                  {r.recommendations.videos.map((v: any, i: number) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <Play size={16} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{v.title}</p>
                        <p className="text-[11px] text-white/40">{v.duration}</p>
                        <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{v.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Growth Analysis (retake only) ── */}
        {r.growth_analysis && (
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(124,58,237,0.08))', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-green-400/80 mb-3">📈 Growth Analysis</p>
            {r.growth_analysis.overall_narrative && <p className="text-sm text-white/80 leading-relaxed mb-3">{r.growth_analysis.overall_narrative}</p>}
            {r.growth_analysis.biggest_improvement && (
              <div className="p-3 rounded-xl mb-2" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <p className="text-[10px] font-bold text-green-400 mb-0.5">Biggest Improvement</p>
                <p className="text-xs text-white/70">{r.growth_analysis.biggest_improvement}</p>
              </div>
            )}
            {r.growth_analysis.area_to_focus && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)' }}>
                <p className="text-[10px] font-bold text-amber-400 mb-0.5">Focus Area</p>
                <p className="text-xs text-white/70">{r.growth_analysis.area_to_focus}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Bottom CTA ── */}
        <div className="text-center pt-4 pb-8">
          <p className="text-lg font-bold text-white mb-2">{user.name?.split(' ')[0] || 'Hey'}, {isFemaleUser ? 'Aryan' : 'Arya'} now knows you 💜</p>
          <button
            onClick={() => router.push('/arya/chat')}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
          >
            <MessageSquare size={18} /> Chat with {isFemaleUser ? 'Aryan' : 'Arya'}
          </button>
          {daysTillRetake > 0 && (
            <p className="text-xs text-[var(--muted)] mt-3">Next assessment in {daysTillRetake} day{daysTillRetake !== 1 ? 's' : ''}</p>
          )}
          {daysTillRetake === 0 && (
            <button onClick={() => router.push('/arya/self-awareness-test')} className="text-xs text-purple-400 mt-3 underline">
              Retake available! Take it now →
            </button>
          )}
          <button
            onClick={() => router.push('/arya/self-awareness-test/history')}
            className="flex items-center justify-center gap-1 mx-auto mt-3 text-xs text-[var(--muted)] hover:text-white transition-colors"
          >
            View past reports <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

