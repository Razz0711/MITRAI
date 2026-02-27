// ============================================
// MitrAI - Login / Sign Up Page
// ============================================

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const DEPARTMENTS = [
  'CSE', 'AI', 'Mechanical', 'Civil', 'Electrical', 'Electronics', 'Chemical',
  'Integrated M.Sc. Mathematics', 'Integrated M.Sc. Physics', 'Integrated M.Sc. Chemistry',
  'B.Tech Physics', 'Mathematics & Computing',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup, user } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // OTP states
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  // Resend timer countdown
  useEffect(() => {
    if (otpResendTimer <= 0) return;
    const t = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendTimer]);

  // Auto-switch to signup mode when invited via ?ref= link
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setIsSignup(true);
    }
  }, [searchParams]);

  // Redirect if already logged in
  if (user) {
    router.push('/dashboard');
    return null;
  }

  const isSvnitEmail = (e: string) => /^[^@]+@([a-z0-9-]+\.)?svnit\.ac\.in$/.test(e);

  const sendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!isSvnitEmail(trimmedEmail)) {
      setError('Only SVNIT email addresses are allowed (e.g. name@svnit.ac.in or name@amhd.svnit.ac.in)');
      return;
    }
    setOtpSending(true);
    setError('');
    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email: trimmedEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpStep(true);
        setOtpResendTimer(30);
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtpAndProceed = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    setOtpVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email: trimmedEmail, code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Invalid code');
        setOtpVerifying(false);
        return;
      }

      // OTP verified — now do actual login/signup
      if (isSignup) {
        const result = await signup({
          name: name.trim(),
          email: trimmedEmail,
          password,
          admissionNumber: admissionNumber.trim().toUpperCase(),
          department,
          yearLevel,
          dob,
        });
        if (result.success) {
          router.push('/onboarding');
        } else {
          setError(result.error || 'Something went wrong');
        }
      } else {
        const result = await login(trimmedEmail, password);
        if (result.success) {
          router.push('/dashboard');
        } else {
          setError(result.error || 'Invalid credentials');
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!isSvnitEmail(trimmedEmail)) {
      setError('Only SVNIT email addresses are allowed (e.g. name@svnit.ac.in or name@amhd.svnit.ac.in)');
      return;
    }

    if (isSignup) {
      if (!name.trim()) { setError('Name is required'); return; }
      if (!admissionNumber.trim()) { setError('Admission number is required'); return; }
      if (!department) { setError('Please select your department'); return; }
      if (!yearLevel) { setError('Please select your year'); return; }
      if (!dob) { setError('Please enter your date of birth'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    } else {
      if (!trimmedEmail || !password) { setError('Please enter email and password'); return; }
    }

    // All validations passed → send OTP
    sendOtp();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {isSignup ? 'Join MitrAI' : 'Welcome back'}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {isSignup ? 'Register with your SVNIT college email' : 'Sign in with your SVNIT college email'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignup && (
            <>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="input-field text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Admission Number</label>
                <input
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  placeholder="e.g. U22MA001"
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Year</label>
                <select
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">Select year</option>
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="input-field text-sm"
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-[10px] text-[var(--muted)] mt-0.5">Only day & month shown publicly for birthday celebrations</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">SVNIT Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="i22ma038@amhd.svnit.ac.in"
              className="input-field text-sm"
              autoFocus={!isSignup}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? 'Min 6 characters' : 'Your password'}
              className="input-field text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full text-sm py-2.5" disabled={otpSending}>
            {otpSending ? 'Sending verification code...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* OTP Verification Modal */}
        {otpStep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="card p-6 w-full max-w-sm slide-up">
              <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--primary)]/20 border border-[var(--primary)]/30 flex items-center justify-center text-2xl">
                  ✉️
                </div>
                <h2 className="text-lg font-bold">Verify Your Email</h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Enter the 6-digit code sent to <strong className="text-[var(--primary-light)]">{email}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="input-field text-center text-2xl font-mono tracking-[0.5em] py-3"
                  maxLength={6}
                  autoFocus
                />

                {error && (
                  <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  onClick={verifyOtpAndProceed}
                  disabled={otpCode.length !== 6 || otpVerifying}
                  className="btn-primary w-full text-sm py-2.5 disabled:opacity-50"
                >
                  {otpVerifying ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setOtpStep(false); setOtpCode(''); setError(''); }}
                    className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    ← Go back
                  </button>
                  <button
                    onClick={sendOtp}
                    disabled={otpResendTimer > 0 || otpSending}
                    className="text-xs text-[var(--primary-light)] hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {otpResendTimer > 0 ? `Resend in ${otpResendTimer}s` : 'Resend code'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toggle */}
        <p className="text-center text-xs text-[var(--muted)] mt-6">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignup(!isSignup); setError(''); }}
            className="text-[var(--primary-light)] hover:underline font-medium"
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-[var(--muted)]">Loading...</div></div>}>
      <LoginPageInner />
    </Suspense>
  );
}
