// ============================================
// MitrAI - Voice/Video Call Room Component
// Uses Jitsi Meet iframe (most reliable approach)
// ============================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface CallRoomProps {
  roomName: string;
  displayName: string;
  onLeave?: () => void;
  audioOnly?: boolean;
}

export default function CallRoom({ roomName, displayName, onLeave, audioOnly = false }: CallRoomProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Build the Jitsi Meet URL with config
  const getJitsiUrl = useCallback(() => {
    const sanitizedRoom = `MitrAI_${roomName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const domain = 'meet.jit.si';

    const config = [
      'config.prejoinPageEnabled=false',
      'config.disableDeepLinking=true',
      'config.enableWelcomePage=false',
      'config.enableClosePage=false',
      'config.disableThirdPartyRequests=true',
      'config.startWithAudioMuted=false',
      `config.startWithVideoMuted=${audioOnly}`,
      'config.enableNoisyMicDetection=true',
      'config.hideConferenceSubject=true',
      'config.hideConferenceTimer=false',
      'config.subject=MitrAI Study Session',
      'config.disableInviteFunctions=true',
      'interfaceConfig.SHOW_JITSI_WATERMARK=false',
      'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
      'interfaceConfig.SHOW_BRAND_WATERMARK=false',
      'interfaceConfig.SHOW_POWERED_BY=false',
      'interfaceConfig.DEFAULT_BACKGROUND=#0f0f1a',
      'interfaceConfig.TOOLBAR_ALWAYS_VISIBLE=true',
      'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=false',
      'interfaceConfig.MOBILE_APP_PROMO=false',
      'interfaceConfig.HIDE_INVITE_MORE_HEADER=true',
      'interfaceConfig.DISABLE_RINGING=true',
    ];

    const userInfoParam = `userInfo.displayName=${encodeURIComponent(displayName || 'Student')}`;

    return `https://${domain}/${sanitizedRoom}#${config.join('&')}&${userInfoParam}`;
  }, [roomName, displayName, audioOnly]);

  // ── Anti-screenshot / anti-recording protections ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText('').catch(() => {});
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData('text/plain', 'Screenshot disabled for privacy');
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);

  // Handle iframe load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoading(false);
      setIsConnected(true);
    };

    const handleError = () => {
      setError('Failed to load video call. Please check your internet connection or try disabling ad-blockers.');
      setIsLoading(false);
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    // Timeout fallback - if iframe hasn't loaded in 15s, show connected anyway
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setIsConnected(true);
      }
    }, 15000);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
      clearTimeout(timeout);
    };
  }, [isLoading]);

  // Listen for messages from Jitsi iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://meet.jit.si') return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'video-conference-left' || data.event === 'readyToClose') {
          onLeave?.();
        }
      } catch (err) {
        // Ignore non-JSON messages from Jitsi iframe
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLeave]);

  const handleEndCall = () => {
    onLeave?.();
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-5xl mb-4">😔</div>
          <h3 className="text-xl font-bold mb-2 text-[var(--error)]">Connection Error</h3>
          <p className="text-[var(--muted)] mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setError(''); setIsLoading(true); }} className="btn-primary">
              🔄 Try Again
            </button>
            <button onClick={() => onLeave?.()} className="btn-secondary">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* Privacy protection notice */}
      {isConnected && (
        <div className="absolute bottom-2 left-2 z-30 opacity-60">
          <span className="text-[9px] text-[var(--muted)] flex items-center gap-1">🔒 Screenshot protection active</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]/90">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-3xl animate-pulse">
              {audioOnly ? '🎙️' : '📹'}
            </div>
            <p className="text-lg font-semibold mb-1">Connecting...</p>
            <p className="text-sm text-[var(--muted)]">Setting up your {audioOnly ? 'voice' : 'video'} call</p>
            <p className="text-xs text-[var(--muted)] mt-2">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Waiting for buddy overlay */}
      {isConnected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="px-5 py-3 rounded-xl bg-[var(--surface)]/95 border border-[var(--primary)]/30 backdrop-blur-sm shadow-lg text-center">
            <p className="text-sm font-semibold text-[var(--primary-light)]">Share this room code with your buddy:</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomName).then(() => {
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                });
              }}
              className="mt-2 px-4 py-1.5 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)]/30 font-mono text-lg tracking-widest text-[var(--primary-light)] hover:bg-[var(--primary)]/30 transition-all"
            >
              {codeCopied ? '✅ Copied!' : roomName}
            </button>
          </div>
        </div>
      )}

      {/* Top bar with End Call */}
      {isConnected && (
        <div className="px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-sm font-medium">
              {audioOnly ? '🎙️ Voice Call' : '📹 Video Call'} — Room: {roomName}
            </span>
          </div>
          <button
            onClick={handleEndCall}
            className="px-4 py-2 rounded-lg text-sm bg-[var(--error)] text-white font-medium hover:bg-red-600 transition-all"
          >
            End Call
          </button>
        </div>
      )}

      {/* Jitsi iframe */}
      <iframe
        ref={iframeRef}
        src={getJitsiUrl()}
        className="flex-1 w-full border-0"
        allow="camera; microphone; display-capture; autoplay; clipboard-write"
        allowFullScreen
        style={{ minHeight: 0 }}
      />
    </div>
  );
}
