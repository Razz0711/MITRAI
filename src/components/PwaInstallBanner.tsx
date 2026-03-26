// ============================================
// MitrRAI - PWA Install Banner
// Shows "Add to Home Screen" prompt for mobile users
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed before (don't show for 7 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait 30 seconds before showing banner (don't annoy immediately)
      setTimeout(() => setShowBanner(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto"
      style={{ animation: 'slideUpFade 0.4s ease-out' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(109,40,217,0.95))',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(124,58,237,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
        }}
      >
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Download size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">Install MitrrAi</p>
          <p className="text-[11px] text-white/70 leading-tight mt-0.5">Add to home screen for the best experience</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 px-4 py-1.5 rounded-xl bg-white text-purple-700 text-xs font-bold hover:bg-white/90 active:scale-95 transition-all"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-lg text-white/50 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
