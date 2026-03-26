// ============================================
// MitrRAI - Onboarding Walkthrough
// 3-step guided tour for first-time users
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, X, MessageCircle, Users, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: <MessageCircle size={28} className="text-violet-400" />,
    emoji: '💬',
    title: 'Campus Feed',
    description: 'Post what you\'re doing, find people nearby, and connect with your campus in real-time.',
    color: 'from-violet-500/20 to-purple-500/20',
    borderColor: 'rgba(139,92,246,0.3)',
  },
  {
    icon: <Users size={28} className="text-emerald-400" />,
    emoji: '🤝',
    title: 'Smart Matching',
    description: 'Get matched with study buddies, project partners, and hangout friends based on your interests.',
    color: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  {
    icon: <Sparkles size={28} className="text-pink-400" />,
    emoji: '✨',
    title: 'Meet Arya',
    description: 'Your AI bestie who helps with studies, gives advice, and is always there to chat.',
    color: 'from-pink-500/20 to-rose-500/20',
    borderColor: 'rgba(236,72,153,0.3)',
  },
];

export default function OnboardingWalkthrough() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('mitrrai_onboarding_done');
    if (!seen) {
      // Show after a short delay so page loads first
      setTimeout(() => setShow(true), 1500);
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setShow(false);
    localStorage.setItem('mitrrai_onboarding_done', 'true');
  };

  if (!show) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-sm rounded-3xl p-6 relative"
        style={{
          background: 'var(--background)',
          border: `1px solid ${current.borderColor}`,
          animation: 'fadeSlideUp 0.4s ease-out',
        }}
        key={step}
      >
        {/* Skip button */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div
            className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${current.color} flex items-center justify-center`}
            style={{ animation: 'float 3s ease-in-out infinite' }}
          >
            <span className="text-4xl">{current.emoji}</span>
          </div>
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold text-[var(--foreground)] text-center mb-2">{current.title}</h2>
        <p className="text-sm text-[var(--muted)] text-center leading-relaxed mb-6">{current.description}</p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                background: i === step ? 'var(--primary)' : 'var(--surface)',
              }}
            />
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-2xl bg-[var(--primary)] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
          style={{ boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}
        >
          {step < STEPS.length - 1 ? (
            <>
              Next <ChevronRight size={16} />
            </>
          ) : (
            'Get Started 🚀'
          )}
        </button>
      </div>
    </div>
  );
}
