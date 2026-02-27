// ============================================
// MitrAI - Subscription / Pricing Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { SubscriptionPlan } from '@/lib/types';

const UPI_ID = '7061001946@ybl';
const PAYEE_NAME = 'Raj Kumar';

const PLAN_PRICES: Record<string, number> = {
  monthly: 99,
  yearly: 999,
};

function getUpiUrl(plan: string) {
  const amount = PLAN_PRICES[plan] || 0;
  const label = plan === 'monthly' ? 'MitrAI Monthly Pro' : 'MitrAI Yearly Pro';
  return `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(label)}`;
}

function getQrImageUrl(plan: string) {
  const upiUrl = getUpiUrl(plan);
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiUrl)}&bgcolor=1a1a2e&color=ffffff&format=png`;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('free');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentStep, setPaymentStep] = useState<'qr' | 'confirming' | 'done'>('qr');
  const [transactionId, setTransactionId] = useState('');

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

  const openPaymentModal = (plan: 'monthly' | 'yearly') => {
    setPaymentPlan(plan);
    setPaymentStep('qr');
    setTransactionId('');
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async () => {
    if (!user) return;
    setPaymentStep('confirming');
    setSubscribing(true);
    setSelectedPlan(paymentPlan);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, plan: paymentPlan, transactionId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPlan(paymentPlan);
        setPaymentStep('done');
        setTimeout(() => {
          setShowPaymentModal(false);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        }, 1500);
      }
    } catch { /* ignore */ }
    setSubscribing(false);
    setSelectedPlan(null);
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) return;
    if (plan === 'monthly' || plan === 'yearly') {
      openPaymentModal(plan);
      return;
    }
    // Free plan — just switch
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
            <p className="text-[10px] text-green-400 mt-1">Pay via UPI QR</p>
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
              : 'Get Monthly — ₹99/mo'}
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
              : 'Get Yearly — ₹999/yr'}
          </button>
        </div>
      </div>

      {/* FAQ / Info */}
      <div className="mt-8 card p-5">
        <h3 className="text-sm font-semibold mb-4 text-center">Frequently Asked Questions</h3>
        <div className="space-y-4 max-w-2xl mx-auto">
          <FaqItem
            q="How do I pay?"
            a="Click the subscribe button for your preferred plan. A UPI QR code will appear — scan it with any UPI app (GPay, PhonePe, Paytm, BHIM, etc.) and complete the payment. Your plan is activated instantly."
          />
          <FaqItem
            q="Is the payment secure?"
            a="Yes! You pay directly via UPI — we never see your bank details. The QR code connects you to a verified UPI ID for instant, safe transfers."
          />
          <FaqItem
            q="Can I cancel or downgrade?"
            a="Absolutely. You can switch to the free plan at any time. No questions asked. For refunds within 7 days, contact support."
          />
          <FaqItem
            q="What if my payment doesn't reflect?"
            a="Enter your UPI transaction/UTR ID during confirmation for faster verification. If the plan isn't activated within a few minutes, contact us with the transaction ID."
          />
        </div>
      </div>

      {/* QR Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { if (paymentStep === 'qr') setShowPaymentModal(false); }}>
          <div className="glass-card p-6 w-full max-w-sm mx-4 relative" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            {paymentStep !== 'confirming' && (
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-[var(--muted)] text-sm"
              >
                ✕
              </button>
            )}

            {paymentStep === 'qr' && (
              <>
                <div className="text-center mb-4">
                  <span className="text-3xl">{paymentPlan === 'monthly' ? '⚡' : '👑'}</span>
                  <h3 className="text-lg font-bold mt-2">
                    {paymentPlan === 'monthly' ? 'Monthly Pro' : 'Yearly Pro'}
                  </h3>
                  <div className="mt-1">
                    <span className="text-2xl font-bold">₹{PLAN_PRICES[paymentPlan]}</span>
                    <span className="text-xs text-[var(--muted)]">
                      /{paymentPlan === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-white rounded-2xl shadow-lg">
                    <img
                      src={getQrImageUrl(paymentPlan)}
                      alt="UPI QR Code"
                      width={220}
                      height={220}
                      className="rounded-xl"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-xs text-[var(--muted)] mb-1">Scan with any UPI app to pay</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="text-lg">📱</span>
                    <span className="text-[10px] text-[var(--muted)]">GPay • PhonePe • Paytm • BHIM • Any UPI app</span>
                  </div>
                  <div className="mt-2 px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--border)] inline-block">
                    <p className="text-[10px] text-[var(--muted)]">UPI ID</p>
                    <p className="text-xs font-mono font-semibold">{UPI_ID}</p>
                  </div>
                </div>

                {/* Transaction ID */}
                <div className="mb-4">
                  <label className="text-xs text-[var(--muted)] block mb-1">Transaction / UTR ID (optional)</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    placeholder="Enter UPI transaction ID for verification"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--border)] text-xs placeholder:text-[var(--muted)]/50 focus:outline-none focus:border-[var(--primary)]/50"
                  />
                </div>

                <button
                  onClick={handlePaymentConfirm}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/20 hover:scale-[1.01] active:scale-[0.99]"
                >
                  ✅ I&apos;ve Completed the Payment
                </button>

                <p className="text-[10px] text-[var(--muted)] text-center mt-3">
                  Your plan will be activated instantly after confirmation.
                  For issues, contact support.
                </p>
              </>
            )}

            {paymentStep === 'confirming' && (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center animate-pulse">
                  <span className="text-2xl">⏳</span>
                </div>
                <p className="text-sm font-semibold">Activating your plan...</p>
                <p className="text-xs text-[var(--muted)] mt-1">This will take just a moment</p>
              </div>
            )}

            {paymentStep === 'done' && (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <span className="text-2xl">🎉</span>
                </div>
                <p className="text-sm font-bold text-green-400">Plan Activated!</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Welcome to MitrAI {paymentPlan === 'monthly' ? 'Monthly' : 'Yearly'} Pro!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 slide-up">
          <div className="px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/40 backdrop-blur-sm shadow-lg">
            <p className="text-sm font-semibold text-green-400">
              ✅ Plan updated successfully!
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
