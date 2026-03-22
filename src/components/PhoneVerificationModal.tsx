'use client';

import { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Smartphone, CheckCircle, Shield } from 'lucide-react';

export default function PhoneVerificationModal({ 
  isVisible,
  onSuccess 
}: { 
  isVisible: boolean;
  onSuccess: () => void;
}) {
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone, 2 = OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Initialize Recaptcha invisible once mounted
  useEffect(() => {
    if (isVisible && !recaptchaVerifier && recaptchaContainerRef.current) {
      try {
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: 'invisible',
        });
        setRecaptchaVerifier(verifier);
      } catch (err) {
        console.error('Recaptcha init error:', err);
      }
    }
  }, [isVisible, recaptchaVerifier]);

  // Prevent closing the modal externally if this is required for app access
  if (!isVisible) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return setError('Invalid phone number');

    try {
      setLoading(true);
      setError('');
      
      if (!recaptchaVerifier) throw new Error('Security check loading, please try again.');

      const confirmation = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep(2);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to send OTP. Check the phone number format.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return setError('OTP must be 6 digits');

    try {
      setLoading(true);
      setError('');

      if (!confirmationResult) throw new Error('Session expired. Go back and try again.');

      // 1. Verify against Firebase securely
      await confirmationResult.confirm(otp);

      // 2. Alert our Supabase backend to officially verify the user
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server rejected verification');

      // Success! Unblock the app.
      onSuccess();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setError('Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 pb-2 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-4 border border-indigo-500/20">
            {step === 1 ? <Smartphone size={24} /> : <Shield size={24} />}
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] tracking-tight">
            {step === 1 ? 'Verify Your Identity' : 'Enter Security Code'}
          </h2>
          <p className="text-xs text-[var(--muted-strong)] mt-2 leading-relaxed px-2">
            {step === 1 
              ? 'To protect MitrRAI from spam and fake accounts, please link a valid phone number.' 
              : `We sent a 6-digit code to ${phone}.`}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--muted-strong)]">Phone Number (with country code)</label>
                <input
                  type="tel"
                  placeholder="+91 99999 99999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="input-field text-sm font-mono tracking-wider py-3 px-4"
                  autoComplete="tel"
                />
              </div>
              
              {/* Invisible Recaptcha Mount Point */}
              <div ref={recaptchaContainerRef} />

              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary w-full py-3 mt-2 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
              >
                {loading ? 'Sending Secure Code...' : 'Send OTP Waitlist'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--muted-strong)]">6-Digit OTP</label>
                <input
                  type="text"
                  placeholder="123 456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  className="input-field text-center text-xl font-bold font-mono tracking-[0.5em] py-3 px-4"
                  autoComplete="one-time-code"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] !bg-green-500 hover:!bg-green-600"
              >
                {loading ? 'Verifying...' : (
                  <>
                    <CheckCircle size={18} /> Confirm Access
                  </>
                )}
              </button>

              <button 
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="text-xs font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)] mt-2 transition-colors"
              >
                Change Phone Number
              </button>
            </form>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-auto px-6 py-4 bg-black/20 border-t border-[var(--border)]/50 text-center">
          <p className="text-[10px] text-[var(--muted-strong)]">
            Powered securely by Google Firebase & Supabase. Your phone number is encrypted and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}
