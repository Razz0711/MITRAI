// ============================================
// MitrAI - Password Reset Page
// Handles both: requesting a reset & setting new password
// ============================================

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'request' | 'update'>('request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if we arrived from a password reset redirect
  // Supabase PKCE flow sends ?code=...&type=recovery as query params
  // Legacy implicit flow sends #access_token=...&type=recovery as hash fragments
  useEffect(() => {
    let handled = false;

    // 1) PKCE flow: exchange the ?code= parameter for a session
    const code = searchParams.get('code');
    const typeParam = searchParams.get('type');
    if (code) {
      handled = true;
      supabaseBrowser.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError('Invalid or expired reset link. Please request a new one.');
        } else if (typeParam === 'recovery') {
          setStep('update');
        } else {
          setStep('update');
        }
      });
    }

    // 2) Legacy implicit flow: tokens in URL hash
    if (!handled) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashType = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (hashType === 'recovery' && accessToken) {
        handled = true;
        supabaseBrowser.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        }).then(({ error }) => {
          if (error) {
            setError('Invalid or expired reset link. Please request a new one.');
          } else {
            setStep('update');
          }
        });
      }
    }

    // 3) Listen for PASSWORD_RECOVERY auth event as a fallback
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep('update');
        setError('');
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage('If an account with this email exists, a password reset link has been sent. Please check your inbox.');
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseBrowser.auth.updateUser({ password });
      if (error) {
        setError(error.message || 'Failed to update password');
      } else {
        setMessage('Password updated successfully! Redirecting to login...');
        // Sign out the recovery session so user can log in fresh
        await supabaseBrowser.auth.signOut();
        setTimeout(() => router.push('/login'), 2000);
      }
    } catch {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="MitrAI" className="h-14 w-auto mx-auto mb-3" />
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {step === 'request' ? 'Reset Password' : 'Set New Password'}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {step === 'request'
              ? 'Enter your SVNIT email to receive a reset link'
              : 'Choose a new password for your account'}
          </p>
        </div>

        {step === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">SVNIT Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@svnit.ac.in"
                className="input-field text-sm"
                autoFocus
                required
              />
            </div>

            {message && (
              <p className="text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
            {error && (
              <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full text-sm py-2.5" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="input-field text-sm"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="input-field text-sm"
                required
              />
            </div>

            {message && (
              <p className="text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
            {error && (
              <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full text-sm py-2.5" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          <button
            onClick={() => router.push('/login')}
            className="text-[var(--primary-light)] hover:underline font-medium"
          >
            Back to Sign In
          </button>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-[var(--muted)]">Loading...</div></div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
