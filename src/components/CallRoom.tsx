// ============================================
// MitrAI - Native WebRTC Voice/Video Call
// Uses Supabase Realtime Broadcast for signaling
// P2P media — zero lag, no third-party iframe
// ============================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface CallRoomProps {
  roomName: string;
  displayName: string;
  onLeave?: () => void;
  audioOnly?: boolean;
}

// Free STUN servers for NAT traversal (handles 85%+ of network configs)
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
  { urls: 'stun:stun.voipbuster.com:3478' },
];

type CallStatus = 'getting-media' | 'waiting' | 'connecting' | 'connected' | 'failed';

export default function CallRoom({ roomName, displayName, onLeave, audioOnly = false }: CallRoomProps) {
  const [status, setStatus] = useState<CallStatus>('getting-media');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(audioOnly);
  const [partnerName, setPartnerName] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const announceRef = useRef<NodeJS.Timeout | null>(null);
  const myId = useRef(`${Date.now()}_${Math.random().toString(36).slice(2, 10)}`).current;
  const negotiatingRef = useRef(false);
  const connectedRef = useRef(false);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (announceRef.current) { clearInterval(announceRef.current); announceRef.current = null; }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (channelRef.current) {
      supabaseBrowser.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    connectedRef.current = false;
    negotiatingRef.current = false;
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // ── 1. Get local media ──
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: audioOnly ? false : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current && !audioOnly) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        if (mounted) setError(
          audioOnly
            ? 'Microphone access denied. Please allow microphone access in your browser settings.'
            : 'Camera/Microphone access denied. Please allow access in your browser settings.'
        );
        return;
      }

      // ── 2. Create RTCPeerConnection ──
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      localStreamRef.current!.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.ontrack = (event) => {
        if (!mounted) return;
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
      };

      pc.oniceconnectionstatechange = () => {
        if (!mounted) return;
        const s = pc.iceConnectionState;
        if ((s === 'connected' || s === 'completed') && !connectedRef.current) {
          connectedRef.current = true;
          setStatus('connected');
          if (announceRef.current) { clearInterval(announceRef.current); announceRef.current = null; }
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
          }
        }
        if (s === 'failed') {
          pc.restartIce();
          setTimeout(() => {
            if (mounted && pc.iceConnectionState === 'failed') setStatus('failed');
          }, 6000);
        }
        if (s === 'disconnected') {
          setTimeout(() => {
            if (mounted && pc.iceConnectionState === 'disconnected') setStatus('failed');
          }, 10000);
        }
      };

      // ── 3. Supabase Realtime Broadcast for signaling ──
      const channel = supabaseBrowser.channel(`call:${roomName}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'ice',
            payload: { candidate: event.candidate.toJSON(), from: myId },
          });
        }
      };

      // ── Signaling handlers ──

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.on('broadcast', { event: 'join' }, async (msg: any) => {
        const data = msg.payload as { from: string; name: string };
        if (data.from === myId || !mounted || connectedRef.current) return;
        setPartnerName(data.name || 'Study Buddy');
        setStatus('connecting');
        if (myId < data.from && !negotiatingRef.current) {
          negotiatingRef.current = true;
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({
              type: 'broadcast',
              event: 'offer',
              payload: { sdp: pc.localDescription!.toJSON(), from: myId, name: displayName },
            });
          } catch (e) { console.error('Offer error:', e); negotiatingRef.current = false; }
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.on('broadcast', { event: 'offer' }, async (msg: any) => {
        const data = msg.payload as { sdp: RTCSessionDescriptionInit; from: string; name: string };
        if (data.from === myId || !mounted) return;
        setPartnerName(data.name || 'Study Buddy');
        setStatus('connecting');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: 'broadcast',
            event: 'answer',
            payload: { sdp: pc.localDescription!.toJSON(), from: myId, name: displayName },
          });
        } catch (e) { console.error('Answer error:', e); }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.on('broadcast', { event: 'answer' }, async (msg: any) => {
        const data = msg.payload as { sdp: RTCSessionDescriptionInit; from: string; name: string };
        if (data.from === myId || !mounted) return;
        setPartnerName(data.name || 'Study Buddy');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (e) { console.error('Remote desc error:', e); }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.on('broadcast', { event: 'ice' }, async (msg: any) => {
        const data = msg.payload as { candidate: RTCIceCandidateInit; from: string };
        if (data.from === myId || !mounted) return;
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch { /* late ICE ok */ }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.on('broadcast', { event: 'leave' }, (msg: any) => {
        const data = msg.payload as { from: string };
        if (data.from === myId || !mounted) return;
        cleanup();
        onLeave?.();
      });

      // ── Subscribe & announce ──
      channel.subscribe((subStatus: string) => {
        if (subStatus === 'SUBSCRIBED' && mounted) {
          setStatus('waiting');
          const announce = () => {
            channel.send({
              type: 'broadcast',
              event: 'join',
              payload: { from: myId, name: displayName },
            });
          };
          announce();
          announceRef.current = setInterval(announce, 2000);
        }
      });
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'leave', payload: { from: myId } });
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, displayName, audioOnly]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(prev => !prev);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(prev => !prev);
  };

  const endCall = () => {
    channelRef.current?.send({ type: 'broadcast', event: 'leave', payload: { from: myId } });
    setTimeout(() => { cleanup(); onLeave?.(); }, 150);
  };

  // ── Error screen ──
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0f0f1a]">
        <div className="p-8 text-center max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-5xl mb-4">🎙️</div>
          <h3 className="text-xl font-bold mb-2 text-[var(--error)]">Permission Required</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
              🔄 Try Again
            </button>
            <button onClick={() => onLeave?.()} className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] text-sm hover:bg-[var(--surface-light)] transition-colors">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──
  return (
    <div className="h-full flex flex-col bg-[#0f0f1a] relative overflow-hidden select-none">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Remote Video */}
      {!audioOnly && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${status === 'connected' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* Waiting / Connecting */}
      {(status === 'getting-media' || status === 'waiting' || status === 'connecting') && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center px-4">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-4xl animate-pulse shadow-lg shadow-purple-500/20">
              {audioOnly ? '🎙️' : '📹'}
            </div>
            <p className="text-xl font-semibold text-white mb-2">
              {status === 'getting-media' && 'Setting up...'}
              {status === 'waiting' && 'Waiting for partner...'}
              {status === 'connecting' && `Connecting with ${partnerName}...`}
            </p>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              {status === 'getting-media' && 'Requesting camera & microphone access'}
              {status === 'waiting' && 'Share the room code below with your study buddy'}
              {status === 'connecting' && 'Establishing peer-to-peer connection...'}
            </p>
            {status === 'waiting' && (
              <div className="mt-8">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(roomName).then(() => {
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    });
                  }}
                  className="px-8 py-4 rounded-xl bg-white/10 border border-white/20 font-mono text-3xl tracking-[0.3em] text-white hover:bg-white/20 transition-all active:scale-95"
                >
                  {codeCopied ? '✅ Copied!' : roomName}
                </button>
                <p className="text-xs text-gray-500 mt-3">Tap to copy room code</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice-only connected UI */}
      {audioOnly && status === 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center text-6xl font-bold text-white shadow-2xl shadow-purple-500/30 ring-4 ring-purple-500/20">
              {partnerName.charAt(0).toUpperCase() || '?'}
            </div>
            <p className="text-2xl font-semibold text-white mb-1">{partnerName}</p>
            <p className="text-sm text-green-400 font-medium">{formatDuration(duration)}</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400">Connected · P2P</span>
            </div>
          </div>
        </div>
      )}

      {/* Failed */}
      {status === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center max-w-md p-6">
            <div className="text-5xl mb-4">😔</div>
            <h3 className="text-xl font-bold text-red-400 mb-2">Connection Lost</h3>
            <p className="text-gray-400 mb-6 text-sm">
              The call was disconnected. This can happen due to network issues or firewall restrictions.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
                🔄 Reconnect
              </button>
              <button onClick={() => onLeave?.()} className="px-5 py-2.5 rounded-lg border border-white/20 text-white text-sm hover:bg-white/10">
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-20 px-4 py-3 flex items-center justify-between bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            status === 'connected' ? 'bg-green-500 animate-pulse' : status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
          }`} />
          <span className="text-sm font-medium text-white">
            {audioOnly ? '🎙️ Voice Call' : '📹 Video Call'}
            {status === 'connected' && ` · ${formatDuration(duration)}`}
          </span>
        </div>
        {status === 'connected' && partnerName && (
          <span className="text-sm text-gray-300 truncate max-w-[150px]">{partnerName}</span>
        )}
      </div>

      {/* Local video PiP */}
      {!audioOnly && (
        <div className="absolute top-16 right-4 z-20 w-28 h-40 sm:w-36 sm:h-48 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-black">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800">
              <span className="text-3xl">📷</span>
              <p className="text-[10px] text-gray-400 mt-1">Camera Off</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex items-center justify-center gap-5">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all shadow-lg ${
            isMuted ? 'bg-red-500 text-white ring-2 ring-red-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>

        {!audioOnly && (
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all shadow-lg ${
              isVideoOff ? 'bg-red-500 text-white ring-2 ring-red-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? '📷' : '📹'}
          </button>
        )}

        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center text-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/30 ring-2 ring-red-400/20 active:scale-95"
          title="End Call"
        >
          📞
        </button>
      </div>
    </div>
  );
}
