// ============================================
// MitrRAI - PWA Install Banner
// Always shows on mobile until app is installed
// Handles Android (native prompt) + iOS (manual steps)
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    ) {
      setInstalled(true);
      return;
    }

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Capture Android native prompt when available
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show banner immediately — don't wait for beforeinstallprompt
    setShow(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => setShow(false); // session-only dismiss

  if (!show || installed) return null;

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-50 max-w-md mx-auto"
      style={{ animation: 'slideUpFade 0.4s ease-out' }}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.97), rgba(192,38,211,0.97))',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(124,58,237,0.45), 0 0 0 1px rgba(255,255,255,0.12) inset',
        }}
      >
        {/* Main row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            {isIOS ? <Share size={20} className="text-white" /> : <Download size={20} className="text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">Install MitrrAi App</p>
            <p className="text-[11px] text-white/75 leading-tight mt-0.5">
              {isIOS
                ? 'Tap Share → "Add to Home Screen"'
                : deferredPrompt
                  ? 'Add to home screen for the best experience'
                  : 'Open in Chrome → Menu → "Add to Home Screen"'}
            </p>
          </div>

          {/* Android native install button */}
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white text-purple-700 text-xs font-bold hover:bg-white/90 active:scale-95 transition-all"
            >
              Install
            </button>
          )}

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-lg text-white/50 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* iOS extra hint bar */}
        {isIOS && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-[10px] text-white/60 shrink-0">↓ tap share icon in your browser</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>
        )}
      </div>
    </div>
  );
}
