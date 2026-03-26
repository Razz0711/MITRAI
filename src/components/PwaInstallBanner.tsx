'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    ) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Capture native Android prompt if available
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show immediately
    setShow(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleTap = useCallback(async () => {
    if (deferredPrompt) {
      // Android native install
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShow(false);
      setDeferredPrompt(null);
    } else if (isIOS) {
      // Toggle iOS step instructions
      setShowIOSSteps(s => !s);
    }
    // Android without prompt — tapping does nothing extra (instructions already visible)
  }, [deferredPrompt, isIOS]);

  if (!show) return null;

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-[999] max-w-md mx-auto"
      style={{ animation: 'slideUpFade 0.4s ease-out' }}
    >
      <div
        className="rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #c026d3)',
          boxShadow: '0 8px 32px rgba(124,58,237,0.5)',
        }}
      >
        {/* Main row — fully tappable */}
        <button
          onClick={handleTap}
          className="w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-80 transition-opacity"
        >
          <span className="text-2xl shrink-0">📲</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Install MitrrAi App</p>
            <p className="text-[11px] text-white/75 mt-0.5">
              {deferredPrompt
                ? 'Tap here to add to home screen →'
                : isIOS
                  ? 'Tap here for install steps →'
                  : 'Menu (⋮) → "Add to Home Screen"'}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShow(false); }}
            className="shrink-0 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30"
          >
            <X size={14} className="text-white" />
          </button>
        </button>

        {/* iOS step-by-step (toggles on tap) */}
        {isIOS && showIOSSteps && (
          <div className="px-4 pb-3 space-y-1.5 border-t border-white/20 pt-2">
            <p className="text-[11px] text-white font-semibold mb-1">How to install on iPhone:</p>
            <p className="text-[11px] text-white/80">1. Tap the <strong>Share</strong> icon (□↑) in Safari</p>
            <p className="text-[11px] text-white/80">2. Scroll and tap <strong>"Add to Home Screen"</strong></p>
            <p className="text-[11px] text-white/80">3. Tap <strong>Add</strong> — done! ✅</p>
          </div>
        )}
      </div>
    </div>
  );
}
