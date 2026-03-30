// ============================================
// MitrRAI - Self Awareness Test Page
// Intro → 25 Questions → Loading → Redirect to report
// ============================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Sparkles, Brain, FileText, User, Clock, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  QUESTIONS,
  ANSWER_OPTIONS,
  TRAIT_COLORS,
  TRAIT_LABELS,
  calculateOCEANScores,
  LOADING_MESSAGES,
  LS_TEST_PROGRESS,
  LS_TEST_ANSWERS,
  LS_HAS_TAKEN_TEST,
  LS_LATEST_REPORT_ID,
  LS_LAST_TEST_DATE,
  Answers,
} from '@/lib/personality-test';

type Phase = 'intro' | 'test' | 'loading';

export default function SelfAwarenessTestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [hasTakenBefore, setHasTakenBefore] = useState(false);
  const [lastTestDate, setLastTestDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResume, setShowResume] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isFemaleUser = typeof window !== 'undefined' && localStorage.getItem('mitrrai_user_gender') === 'Female';
  const companionAvatar = isFemaleUser ? '/aryan-avatar.png' : '/arya-avatar.png';

  // Check past test status
  useEffect(() => {
    try {
      const taken = localStorage.getItem(LS_HAS_TAKEN_TEST) === 'true';
      setHasTakenBefore(taken);
      const ld = localStorage.getItem(LS_LAST_TEST_DATE);
      if (ld) setLastTestDate(ld);

      // Check for saved progress
      const savedProgress = localStorage.getItem(LS_TEST_PROGRESS);
      const savedAnswers = localStorage.getItem(LS_TEST_ANSWERS);
      if (savedProgress && savedAnswers) {
        setShowResume(true);
      }
    } catch { /* */ }

    // Also check server
    fetch('/api/arya/personality?action=check')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setHasTakenBefore(d.data.hasTaken);
          if (d.data.lastTestDate) {
            setLastTestDate(d.data.lastTestDate);
            try { localStorage.setItem(LS_LAST_TEST_DATE, d.data.lastTestDate); } catch { /* */ }
          }
        }
      })
      .catch(() => {});
  }, []);

  // Resume saved progress
  const handleResume = () => {
    try {
      const savedQ = parseInt(localStorage.getItem(LS_TEST_PROGRESS) || '0');
      const savedA = JSON.parse(localStorage.getItem(LS_TEST_ANSWERS) || '{}');
      setCurrentQ(savedQ);
      setAnswers(savedA);
      setPhase('test');
      setShowResume(false);
    } catch {
      handleStartFresh();
    }
  };

  const handleStartFresh = () => {
    try {
      localStorage.removeItem(LS_TEST_PROGRESS);
      localStorage.removeItem(LS_TEST_ANSWERS);
    } catch { /* */ }
    setAnswers({});
    setCurrentQ(0);
    setPhase('test');
    setShowResume(false);
  };

  // Save progress to localStorage
  useEffect(() => {
    if (phase === 'test') {
      try {
        localStorage.setItem(LS_TEST_PROGRESS, String(currentQ));
        localStorage.setItem(LS_TEST_ANSWERS, JSON.stringify(answers));
      } catch { /* */ }
    }
  }, [phase, currentQ, answers]);

  // Handle answer selection
  const handleAnswer = useCallback((value: number) => {
    if (isAnimating) return;
    const q = QUESTIONS[currentQ];
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);

    // Auto-advance after 300ms
    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setSlideDir('left');
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentQ(currentQ + 1);
          setIsAnimating(false);
        }, 300);
      } else {
        // Last question answered — go to loading
        handleSubmit(newAnswers);
      }
    }, 300);
  }, [currentQ, answers, isAnimating]);

  // Go back to previous question
  const handleBack = () => {
    if (currentQ === 0) {
      setPhase('intro');
      return;
    }
    if (isAnimating) return;
    setSlideDir('right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentQ(currentQ - 1);
      setIsAnimating(false);
    }, 300);
  };

  // Submit test
  const handleSubmit = async (finalAnswers: Answers) => {
    setPhase('loading');
    setError(null);

    // Start loading animations
    loadingTimerRef.current = setInterval(() => {
      setFakeProgress(prev => Math.min(prev + 0.8, 95));
    }, 200);
    msgTimerRef.current = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);

    try {
      const scores = calculateOCEANScores(finalAnswers);

      // Build rawAnswers as {q1: 4, q2: 3, ...}
      const rawAnswers: Record<string, number> = {};
      for (const [key, val] of Object.entries(finalAnswers)) {
        rawAnswers[`q${key}`] = val as number;
      }

      const res = await fetch('/api/arya/personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, rawAnswers }),
      });

      const data = await res.json();

      if (data.success && data.data?.reportId) {
        // Save to localStorage
        try {
          localStorage.setItem(LS_HAS_TAKEN_TEST, 'true');
          localStorage.setItem(LS_LATEST_REPORT_ID, data.data.reportId);
          localStorage.setItem(LS_LAST_TEST_DATE, new Date().toISOString());
          localStorage.removeItem(LS_TEST_PROGRESS);
          localStorage.removeItem(LS_TEST_ANSWERS);
          // Flag for Arya to show personalized greeting
          localStorage.setItem('mitrrai_just_completed_personality_test', 'true');
        } catch { /* */ }

        setFakeProgress(100);
        setTimeout(() => {
          router.push('/arya/self-awareness-test/report');
        }, 500);
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Test submit error:', err);
      setError('Something went wrong. Please try again.');
      // Keep answers so user can retry
      setPhase('test');
      setCurrentQ(QUESTIONS.length - 1);
    } finally {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, []);

  const daysSinceTest = lastTestDate
    ? Math.floor((Date.now() - new Date(lastTestDate).getTime()) / 86400000)
    : null;

  if (!user) return null;

  // ═══ INTRO SCREEN ═══
  if (phase === 'intro') {
    return (
      <div className="min-h-screen pb-24 page-enter relative overflow-hidden" style={{ background: 'var(--background)' }}>
        {/* Premium background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', top: '-15%', right: '-20%', animation: 'float-orb 20s ease-in-out infinite' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', bottom: '-10%', left: '-15%', animation: 'float-orb 25s ease-in-out infinite reverse' }} />
          <div className="absolute w-[300px] h-[300px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #22c55e 0%, transparent 70%)', top: '40%', left: '50%', transform: 'translateX(-50%)', animation: 'float-orb 18s ease-in-out infinite 3s' }} />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(124,58,237,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        {/* Resume prompt */}
        {showResume && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <div className="mx-4 p-6 rounded-3xl max-w-sm w-full" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}>
              <p className="text-lg font-bold text-[var(--foreground)] mb-2">Continue where you left off?</p>
              <p className="text-sm text-[var(--muted)] mb-5">You have a test in progress.</p>
              <button onClick={handleResume} className="w-full py-3 rounded-xl text-sm font-semibold text-white mb-2" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                Continue Test
              </button>
              <button onClick={handleStartFresh} className="w-full py-3 rounded-xl text-sm font-medium text-[var(--muted)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                Start Fresh
              </button>
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="px-4 pt-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button onClick={() => router.push('/arya')} className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors" style={{ background: 'var(--surface)' }}>
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="px-6 pt-12 text-center max-w-lg mx-auto">
          {/* Purple pill badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}>
            <Sparkles size={12} /> Know Yourself ✨
          </div>

          {/* Headline */}
          <h1 className="text-3xl font-bold text-white mb-3 font-heading">The Self Awareness Test</h1>
          <p className="text-[var(--muted)] text-sm mb-8 leading-relaxed">
            25 questions. 5 minutes. {isFemaleUser ? 'Aryan' : 'Arya'} will understand you like no one else.
          </p>

          {/* 5 Trait pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {Object.entries(TRAIT_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: TRAIT_COLORS[key] }} />
                <span className="text-white/80">{label}</span>
              </div>
            ))}
          </div>

          {/* What to expect cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { icon: <Brain size={20} />, title: '25 Questions', color: '#7c3aed' },
              { icon: <FileText size={20} />, title: 'Detailed Report', color: '#3b82f6' },
              { icon: <User size={20} />, title: 'Arya Personalization', color: '#22c55e' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-2xl text-center sat-card-enter" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${item.color}20`, color: item.color }}>
                  {item.icon}
                </div>
                <p className="text-[11px] font-semibold text-white/80">{item.title}</p>
              </div>
            ))}
          </div>

          {/* Privacy note */}
          <div className="flex items-center justify-center gap-2 mb-6 text-xs text-[var(--muted)]">
            <Shield size={12} />
            <span>Your results are private. Only {isFemaleUser ? 'Aryan' : 'Arya'} can see them.</span>
          </div>

          {/* Last taken info */}
          {hasTakenBefore && daysSinceTest !== null && (
            <div className="flex items-center justify-center gap-2 mb-4 text-xs" style={{ color: '#a78bfa' }}>
              <Clock size={12} />
              <span>Last taken: {daysSinceTest === 0 ? 'Today' : `${daysSinceTest} day${daysSinceTest !== 1 ? 's' : ''} ago`}</span>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleStartFresh}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}
          >
            {hasTakenBefore ? 'Retake Test →' : 'Begin Test →'}
          </button>
        </div>
      </div>
    );
  }

  // ═══ LOADING/COMPLETION SCREEN ═══
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        {/* Premium background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', top: '20%', left: '50%', transform: 'translateX(-50%)', animation: 'float-orb 15s ease-in-out infinite' }} />
          <div className="absolute w-[300px] h-[300px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)', bottom: '10%', right: '-10%', animation: 'float-orb 20s ease-in-out infinite reverse' }} />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(124,58,237,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
        {/* Avatar with pulsing ring */}
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-full overflow-hidden relative z-10">
            <Image src={companionAvatar} alt="Arya" width={112} height={112} className="w-full h-full object-cover" />
          </div>
          {/* Pulsing rings */}
          <div className="absolute inset-0 w-28 h-28 rounded-full" style={{
            border: '3px solid rgba(124,58,237,0.4)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }} />
          <div className="absolute -inset-3 rounded-full" style={{
            border: '2px solid rgba(124,58,237,0.2)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 0.5s',
          }} />
          <div className="absolute -inset-6 rounded-full" style={{
            border: '1px solid rgba(124,58,237,0.1)',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite 1s',
          }} />
        </div>

        {/* Loading message */}
        <p className="text-sm text-[var(--muted)] mb-6 text-center transition-opacity duration-300" key={loadingMsgIdx}>
          {LOADING_MESSAGES[loadingMsgIdx]}
        </p>

        {/* Progress bar */}
        <div className="w-64 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${fakeProgress}%`,
              background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
            }}
          />
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-xl text-center max-w-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button
              onClick={() => handleSubmit(answers)}
              className="px-6 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    );
  }

  // ═══ QUESTION SCREEN ═══
  const question = QUESTIONS[currentQ];
  const traitColor = TRAIT_COLORS[question.trait];
  const progress = ((currentQ + 1) / QUESTIONS.length) * 100;
  const selected = answers[question.id] ?? null;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Premium background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.06] transition-all duration-1000" style={{ background: `radial-gradient(circle, ${traitColor} 0%, transparent 70%)`, top: '-20%', right: '-25%', animation: 'float-orb 22s ease-in-out infinite' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #6d28d9 0%, transparent 70%)', bottom: '-10%', left: '-15%', animation: 'float-orb 18s ease-in-out infinite reverse' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(124,58,237,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        {/* Floating particles */}
        <div className="sat-particle" />
        <div className="sat-particle" />
        <div className="sat-particle" />
        <div className="sat-particle" />
        <div className="sat-particle" />
        <div className="sat-particle" />
      </div>
      {/* Full-screen shimmer overlay */}
      <div className="sat-shimmer absolute inset-0 pointer-events-none z-[1]" />
      {/* Top bar */}
      <div className="shrink-0 px-4 pt-3 pb-2" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        {/* Back button + Question counter */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={handleBack} className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors" style={{ background: 'var(--surface)' }}>
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2 sat-trait-badge">
            <span className="w-2 h-2 rounded-full" style={{ background: traitColor, boxShadow: `0 0 8px ${traitColor}` }} />
            <span className="text-xs font-medium text-[var(--muted)]">{TRAIT_LABELS[question.trait]}</span>
          </div>
          <span className="text-xs font-medium text-[var(--muted)] sat-count-pop" key={currentQ}>
            {currentQ + 1}/{QUESTIONS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out sat-progress-glow"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${traitColor}, ${traitColor}dd)` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-[2]">
        <div
          className={`text-center transition-all duration-300 ${isAnimating ? (slideDir === 'left' ? 'opacity-0 -translate-x-8' : 'opacity-0 translate-x-8') : 'opacity-100 translate-x-0'}`}
        >
          <p className="text-2xl font-bold leading-snug max-w-md sat-aurora-text">
            &ldquo;{question.text}&rdquo;
          </p>
        </div>
      </div>

      {/* Answer options */}
      <div className="shrink-0 px-6 pb-8 relative z-[2]" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-center gap-4 mb-4">
          {ANSWER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleAnswer(opt.value)}
              disabled={isAnimating}
              className={`flex flex-col items-center gap-2 group transition-all duration-200 sat-answer-btn ${selected === opt.value ? 'sat-answer-selected' : ''}`}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold transition-all duration-200"
                style={{
                  background: selected === opt.value
                    ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                    : 'var(--surface)',
                  border: selected === opt.value
                    ? '2px solid #a78bfa'
                    : '1px solid var(--border)',
                  color: selected === opt.value ? '#fff' : 'var(--muted-strong)',
                  transform: selected === opt.value ? 'scale(1.15)' : 'scale(1)',
                  boxShadow: selected === opt.value ? '0 4px 20px rgba(124,58,237,0.5)' : 'none',
                }}
              >
                {opt.value}
              </div>
              <span className="text-[9px] font-medium text-center leading-tight max-w-[56px]" style={{ color: selected === opt.value ? '#a78bfa' : 'var(--muted)' }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-24 left-4 right-4 p-3 rounded-xl text-center text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
