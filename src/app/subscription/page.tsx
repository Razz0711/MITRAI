// ============================================
// MitrAI - Subscription / Pricing Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { SubscriptionPlan } from '@/lib/types';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('free');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    if (user) loadSubscription();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSubscription = async () => {
    try {
      const res = await fetch(`/api/subscription?userId=${user?.id}`);
      const data = await res.json();
      if (data.success) {
        setCurrentPlan(data.data.plan || 'free');
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) return;
    setSubscribing(true);
    setSelectedPlan(plan);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, plan }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPlan(plan);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch { /* ignore */ }
    setSubscribing(false);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center animate-pulse">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
          </div>
          <p className="text-xs text-[var(--muted)]">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">
          <span className="gradient-text">MitrAI Pro</span>
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Upgrade your study experience with premium features
        </p>
        {/* Free banner */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/15 border border-green-500/25">
          <span className="text-green-400 text-sm">🎉</span>
          <span className="text-xs font-medium text-green-400">
            All features are currently FREE during our launch period!
          </span>
        </div>
      </div>

      {/* Current Plan Badge */}
      <div className="text-center mb-6">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${
          currentPlan === 'free'
            ? 'bg-white/10 text-[var(--foreground)]'
            : currentPlan === 'monthly'
            ? 'bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/30'
            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
        }`}>
          {currentPlan === 'free' && '📦 Free Plan'}
          {currentPlan === 'monthly' && '⚡ Monthly Pro'}
          {currentPlan === 'yearly' && '👑 Yearly Pro'}
          <span className="text-[10px] opacity-70">• Current</span>
        </span>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Free Plan */}
        <div className={`card p-5 relative ${currentPlan === 'free' ? 'border-[var(--primary)]/40' : ''}`}>
          {currentPlan === 'free' && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold">
              CURRENT
            </div>
          )}
          <div className="text-center mb-5">
            <span className="text-3xl mb-3 block">📦</span>
            <h3 className="text-lg font-bold">Free</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">₹0</span>
              <span className="text-xs text-[var(--muted)]">/forever</span>
            </div>
          </div>
          <ul className="space-y-2.5 mb-6">
            {[
              'AI-powered buddy matching',
              'Voice & video calls',
              'Study materials sharing',
              'Basic study plans',
              'Up to 5 matches',
              'Friend system & ratings',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs">
                <span className="text-green-400 mt-0.5">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button
            disabled={currentPlan === 'free'}
            onClick={() => handleSubscribe('free')}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all ${
              currentPlan === 'free'
                ? 'bg-white/5 text-[var(--muted)] cursor-default'
                : 'btn-secondary'
            }`}
          >
            {currentPlan === 'free' ? 'Current Plan' : 'Switch to Free'}
          </button>
        </div>

        {/* Monthly Plan */}
        <div className={`card p-5 relative ${currentPlan === 'monthly' ? 'border-[var(--primary)]/40' : ''}`}>
          {currentPlan === 'monthly' && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold">
              CURRENT
            </div>
          )}
          <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
            POPULAR
          </div>
          <div className="text-center mb-5">
            <span className="text-3xl mb-3 block">⚡</span>
            <h3 className="text-lg font-bold">Monthly</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">₹99</span>
              <span className="text-xs text-[var(--muted)]">/month</span>
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-1 line-through">Coming soon</p>
          </div>
          <ul className="space-y-2.5 mb-6">
            {[
              'Everything in Free',
              'Unlimited matches',
              'AI study plan generator',
              'Priority buddy matching',
              'Session analytics & insights',
              'Ad-free experience',
              'Priority support',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs">
                <span className="text-[var(--primary-light)] mt-0.5">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe('monthly')}
            disabled={subscribing && selectedPlan === 'monthly'}
            className="w-full py-2.5 rounded-lg text-xs font-semibold transition-all bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white hover:shadow-lg hover:shadow-[var(--primary)]/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {subscribing && selectedPlan === 'monthly'
              ? 'Processing...'
              : currentPlan === 'monthly'
              ? '✓ Current Plan'
              : 'Get Monthly — Free Now!'}
          </button>
        </div>

        {/* Yearly Plan */}
        <div className={`card p-5 relative ${currentPlan === 'yearly' ? 'border-amber-500/40' : ''}`}>
          {currentPlan === 'yearly' && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              CURRENT
            </div>
          )}
          <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            SAVE 17%
          </div>
          <div className="text-center mb-5">
            <span className="text-3xl mb-3 block">👑</span>
            <h3 className="text-lg font-bold">Yearly</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">₹999</span>
              <span className="text-xs text-[var(--muted)]">/year</span>
            </div>
            <p className="text-[10px] text-green-400 mt-1">₹83/month • Save ₹189</p>
          </div>
          <ul className="space-y-2.5 mb-6">
            {[
              'Everything in Monthly',
              'Exclusive beta features',
              'Custom study room themes',
              'Advanced AI insights',
              'Detailed performance reports',
              'Buddy recommendation boost',
              'Early access to new features',
              'Founding member badge',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs">
                <span className="text-amber-400 mt-0.5">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe('yearly')}
            disabled={subscribing && selectedPlan === 'yearly'}
            className="w-full py-2.5 rounded-lg text-xs font-semibold transition-all bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {subscribing && selectedPlan === 'yearly'
              ? 'Processing...'
              : currentPlan === 'yearly'
              ? '✓ Current Plan'
              : 'Get Yearly — Free Now!'}
          </button>
        </div>
      </div>

      {/* FAQ / Info */}
      <div className="mt-8 card p-5">
        <h3 className="text-sm font-semibold mb-4 text-center">Frequently Asked Questions</h3>
        <div className="space-y-4 max-w-2xl mx-auto">
          <FaqItem
            q="Is MitrAI really free right now?"
            a="Yes! During our launch period at SVNIT, all features are completely free. We'll notify you before any paid plans are activated."
          />
          <FaqItem
            q="When will paid plans start?"
            a="We'll announce the exact date soon. All early users will get special discounts and a founding member badge."
          />
          <FaqItem
            q="Can I cancel anytime?"
            a="Absolutely. You can cancel or downgrade your plan at any time. No questions asked."
          />
          <FaqItem
            q="What payment methods are supported?"
            a="We'll support UPI, cards, net banking, and popular wallets when paid plans launch."
          />
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 slide-up">
          <div className="px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/40 backdrop-blur-sm shadow-lg">
            <p className="text-sm font-semibold text-green-400">
              ✅ Plan updated successfully! (Everything is free for now)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)]/50 pb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-xs font-medium">{q}</span>
        <span className="text-[var(--muted)] text-xs ml-2">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <p className="text-xs text-[var(--muted)] mt-2 fade-in">{a}</p>
      )}
    </div>
  );
}
