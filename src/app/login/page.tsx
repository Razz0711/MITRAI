// ============================================
// MitrAI - Login / Sign Up Page
// ============================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, user } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Redirect if already logged in
  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignup) {
      if (!name.trim()) { setError('Name is required'); return; }
      if (!email.trim()) { setError('Email is required'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

      const result = signup(name.trim(), email.trim().toLowerCase(), password);
      if (result.success) {
        router.push('/onboarding');
      } else {
        setError(result.error || 'Something went wrong');
      }
    } else {
      if (!email.trim() || !password) { setError('Please enter email and password'); return; }

      const result = login(email.trim().toLowerCase(), password);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    }
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
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {isSignup ? 'Start finding your study partner' : 'Sign in to continue'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="input-field text-sm"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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

          <button type="submit" className="btn-primary w-full text-sm py-2.5">
            {isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

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
