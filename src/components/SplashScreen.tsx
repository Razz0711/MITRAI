// ============================================
// MitrRAI - Splash Screen
// Shows branded animation for 1 second on app load
// ============================================

'use client';

import { useState, useEffect } from 'react';

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Only show on first load per session
    const seen = sessionStorage.getItem('mitrrai_splash_shown');
    if (seen) return;

    setShow(true);
    sessionStorage.setItem('mitrrai_splash_shown', 'true');

    // Start fade out after 1.2 seconds
    const fadeTimer = setTimeout(() => setFadeOut(true), 1200);
    // Remove completely after 1.6 seconds
    const hideTimer = setTimeout(() => setShow(false), 1600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center"
      style={{
        background: 'var(--background)',
        transition: 'opacity 0.4s ease',
        opacity: fadeOut ? 0 : 1,
      }}
    >
      {/* Logo with pulse animation */}
      <div
        className="relative mb-4"
        style={{ animation: 'splashLogoEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #c026d3)',
            boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
          }}
        >
          <span className="text-white text-3xl font-extrabold" style={{ fontFamily: 'var(--font-heading)' }}>
            M
          </span>
        </div>
        {/* Glow ring */}
        <div
          className="absolute inset-[-4px] rounded-3xl"
          style={{
            border: '2px solid rgba(124,58,237,0.3)',
            animation: 'pulseRing 1.5s ease-out infinite',
          }}
        />
      </div>

      {/* Brand text */}
      <h1
        className="text-2xl font-extrabold"
        style={{
          fontFamily: 'var(--font-heading)',
          background: 'linear-gradient(135deg, #7c3aed, #c026d3, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'splashTextEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both',
        }}
      >
        MitrrAi
      </h1>
      <p
        className="text-xs text-[var(--muted)] mt-1"
        style={{ animation: 'splashTextEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}
      >
        Your Campus Companion
      </p>
    </div>
  );
}
