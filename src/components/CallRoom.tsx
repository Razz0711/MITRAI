// ============================================
// MitrAI - Voice/Video Call Room Component
// Uses Jitsi Meet (free, open-source, no API key)
// ============================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface CallRoomProps {
  roomName: string;
  displayName: string;
  onLeave?: () => void;
  audioOnly?: boolean;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: Record<string, unknown>) => JitsiAPI;
  }
}

interface JitsiAPI {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  isAudioMuted: () => Promise<boolean>;
  isVideoMuted: () => Promise<boolean>;
  getNumberOfParticipants: () => number;
  addListener: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

export default function CallRoom({ roomName, displayName, onLeave, audioOnly = false }: CallRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(audioOnly);
  const [participantCount, setParticipantCount] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [buddyJoined, setBuddyJoined] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const initJitsi = useCallback(() => {
    if (!containerRef.current || apiRef.current) return;

    try {
      const sanitizedRoom = `MitrAI_${roomName.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: sanitizedRoom,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: displayName || 'Student',
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: audioOnly,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          enableClosePage: false,
          disableThirdPartyRequests: true,
          enableNoisyMicDetection: true,
          toolbarButtons: [
            'microphone',
            'camera',
            'desktop',
            'chat',
            'raisehand',
            'participants-pane',
            'tileview',
            'fullscreen',
          ],
          notifications: [],
          disableInviteFunctions: true,
          hideConferenceSubject: true,
          hideConferenceTimer: false,
          subject: `MitrAI Study Session`,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DEFAULT_BACKGROUND: '#0f0f1a',
          TOOLBAR_ALWAYS_VISIBLE: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_RINGING: true,
        },
      });

      apiRef.current = api;

      api.addListener('videoConferenceJoined', () => {
        setIsLoading(false);
        setIsConnected(true);
        if (audioOnly) {
          api.executeCommand('toggleVideo');
        }
      });

      api.addListener('videoConferenceLeft', () => {
        setIsConnected(false);
        onLeave?.();
      });

      api.addListener('participantJoined', () => {
        setParticipantCount(api.getNumberOfParticipants());
        setBuddyJoined(true);
        setTimeout(() => setBuddyJoined(false), 4000);
      });

      api.addListener('participantLeft', () => {
        setParticipantCount(api.getNumberOfParticipants());
      });

      api.addListener('audioMuteStatusChanged', (data: unknown) => {
        const muteData = data as { muted: boolean };
        setIsMuted(muteData.muted);
      });

      api.addListener('videoMuteStatusChanged', (data: unknown) => {
        const muteData = data as { muted: boolean };
        setIsVideoOff(muteData.muted);
      });

      api.addListener('readyToClose', () => {
        onLeave?.();
      });
    } catch (err) {
      console.error('Jitsi init error:', err);
      setError('Failed to initialize video call. Please try again.');
      setIsLoading(false);
    }
  }, [roomName, displayName, audioOnly, onLeave]);

  const loadJitsiScript = useCallback(() => {
    if (window.JitsiMeetExternalAPI) {
      initJitsi();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => initJitsi();
    script.onerror = () => {
      setError('Failed to load video call service. Please check your internet connection.');
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, [initJitsi]);

  useEffect(() => {
    loadJitsiScript();
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [loadJitsiScript]);

  const toggleMute = () => {
    apiRef.current?.executeCommand('toggleAudio');
  };

  const toggleVideo = () => {
    apiRef.current?.executeCommand('toggleVideo');
  };

  const toggleScreenShare = () => {
    apiRef.current?.executeCommand('toggleShareScreen');
  };

  const hangUp = () => {
    apiRef.current?.executeCommand('hangup');
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-5xl mb-4">😔</div>
          <h3 className="text-xl font-bold mb-2 text-[var(--error)]">Connection Error</h3>
          <p className="text-[var(--muted)] mb-4">{error}</p>
          <button onClick={() => { setError(''); setIsLoading(true); loadJitsiScript(); }} className="btn-primary">
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--background)]/90">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-3xl animate-pulse">
              {audioOnly ? '🎙️' : '📹'}
            </div>
            <p className="text-lg font-semibold mb-1">Connecting...</p>
            <p className="text-sm text-[var(--muted)]">Setting up your {audioOnly ? 'voice' : 'video'} call</p>
          </div>
        </div>
      )}

      {/* Waiting for buddy overlay */}
      {isConnected && participantCount <= 1 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 animate-pulse">
          <div className="px-5 py-3 rounded-xl bg-[var(--surface)]/95 border border-[var(--primary)]/30 backdrop-blur-sm shadow-lg text-center">
            <p className="text-sm font-semibold text-[var(--primary-light)]">⏳ Waiting for your buddy to join...</p>
            <p className="text-[10px] text-[var(--muted)] mt-1 mb-2">Share this room code with your buddy:</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomName).then(() => {
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                });
              }}
              className="px-4 py-1.5 rounded-lg bg-[var(--primary)]/20 border border-[var(--primary)]/30 font-mono text-lg tracking-widest text-[var(--primary-light)] hover:bg-[var(--primary)]/30 transition-all"
            >
              {codeCopied ? '✅ Copied!' : roomName}
            </button>
          </div>
        </div>
      )}

      {/* Buddy joined toast */}
      {buddyJoined && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 slide-up">
          <div className="px-5 py-3 rounded-xl bg-green-500/20 border border-green-500/40 backdrop-blur-sm shadow-lg text-center">
            <p className="text-sm font-semibold text-green-400">🎉 Your buddy joined the call!</p>
          </div>
        </div>
      )}

      {/* Status Bar */}
      {isConnected && (
        <div className="px-4 py-2 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${participantCount > 1 ? 'bg-[var(--success)]' : 'bg-amber-400'} animate-pulse`} />
            <span className="text-sm font-medium">
              {audioOnly ? '🎙️ Voice Call' : '📹 Video Call'} — {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </span>
            {participantCount <= 1 && (
              <span className="text-xs text-amber-400">(only you)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg text-sm transition-all ${
                isMuted ? 'bg-[var(--error)]/20 text-[var(--error)]' : 'bg-white/5 hover:bg-white/10'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            {!audioOnly && (
              <button
                onClick={toggleVideo}
                className={`p-2 rounded-lg text-sm transition-all ${
                  isVideoOff ? 'bg-[var(--error)]/20 text-[var(--error)]' : 'bg-white/5 hover:bg-white/10'
                }`}
                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              >
                {isVideoOff ? '📷' : '📹'}
              </button>
            )}
            <button
              onClick={toggleScreenShare}
              className="p-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-all"
              title="Share screen"
            >
              🖥️
            </button>
            <button
              onClick={hangUp}
              className="px-4 py-2 rounded-lg text-sm bg-[var(--error)] text-white font-medium hover:bg-red-600 transition-all"
            >
              End Call
            </button>
          </div>
        </div>
      )}

      {/* Jitsi Container */}
      <div ref={containerRef} className="flex-1 bg-black" />
    </div>
  );
}
