// ============================================
// MitrAI - Native WebRTC Voice/Video Call
// Uses Supabase Realtime Broadcast for signaling
// P2P media — zero lag, no third-party iframe
// Features: screen share, in-call chat, auto-hangup
// ============================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { playNotificationSound } from '@/hooks/useNotificationSound';

interface CallRoomProps {
  roomName: string;
  displayName: string;
  onLeave?: () => void;
  audioOnly?: boolean;
}

// Fallback STUN servers (used while fetching TURN credentials)
const FALLBACK_ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Metered.ca TURN credentials (fetched dynamically)
const METERED_API_KEY = '85heS8uebI0d0CNV_IGQwtoskEUR0MYeKIP5AcI8kgS_sp0T';
const METERED_DOMAIN = 'mitrai.metered.live';

let _cachedIceServers: RTCIceServer[] | null = null;
let _fetchingIce = false;

async function getIceServers(): Promise<RTCIceServer[]> {
  if (_cachedIceServers) return _cachedIceServers;
  if (_fetchingIce) {
    // Wait for the in-flight fetch
    await new Promise(r => setTimeout(r, 1500));
    return _cachedIceServers || FALLBACK_ICE;
  }
  _fetchingIce = true;
  try {
    const res = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`);
    const servers = await res.json();
    if (Array.isArray(servers) && servers.length > 0) {
      _cachedIceServers = servers;
      console.log('[ICE] Fetched', servers.length, 'TURN servers from Metered.ca');
      return servers;
    }
  } catch (e) {
    console.error('[ICE] Failed to fetch TURN credentials:', e);
  } finally {
    _fetchingIce = false;
  }
  return FALLBACK_ICE;
}

/** Detect mobile device for adaptive constraints */
const isMobile = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

type CallStatus = 'getting-media' | 'waiting' | 'connecting' | 'connected' | 'failed';

interface ChatMsg {
  id: string;
  from: string;
  name: string;
  text: string;
  ts: number;
}

export default function CallRoom({ roomName, displayName, onLeave, audioOnly = false }: CallRoomProps) {
  const [status, setStatus] = useState<CallStatus>('getting-media');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(audioOnly);
  const [partnerName, setPartnerName] = useState('');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  // Screen sharing
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [partnerScreenSharing, setPartnerScreenSharing] = useState(false);

  // In-call chat
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const announceRef = useRef<NodeJS.Timeout | null>(null);
  const myId = useRef(`${Date.now()}_${Math.random().toString(36).slice(2, 10)}`).current;
  const negotiatingRef = useRef(false);
  const connectedRef = useRef(false);
  const showChatRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
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
      // ── 1. Get local media (progressive: audio first, then video) ──
      let stream: MediaStream;
      try {
        // Step A: Always get audio first (lightweight, rarely fails)
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        if (!mounted) { audioStream.getTracks().forEach(t => t.stop()); return; }

        if (audioOnly) {
          stream = audioStream;
        } else {
          // Step B: Then add video with mobile-adaptive constraints
          try {
            const videoConstraints = isMobile()
              ? { width: { ideal: 480 }, height: { ideal: 640 }, facingMode: 'user', frameRate: { ideal: 24 } }
              : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };

            const videoStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: videoConstraints,
            });
            if (!mounted) { audioStream.getTracks().forEach(t => t.stop()); videoStream.getTracks().forEach(t => t.stop()); return; }

            // Merge audio + video into one stream
            stream = new MediaStream([
              ...audioStream.getAudioTracks(),
              ...videoStream.getVideoTracks(),
            ]);
          } catch {
            // Camera denied/failed — fall back to audio-only
            console.warn('Camera failed, falling back to audio-only');
            stream = audioStream;
          }
        }

        localStreamRef.current = stream;
        if (localVideoRef.current && stream.getVideoTracks().length > 0) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        if (mounted) {
          setError('Microphone access denied. Please allow microphone in your browser settings and reload.');
        }
        return;
      }

      // ── 2. Fetch TURN credentials & create RTCPeerConnection ──
      const iceServers = await getIceServers();
      const pc = new RTCPeerConnection({ iceServers });
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
          // 🔊 Play call-connected sound
          playNotificationSound('call');
          if (announceRef.current) { clearInterval(announceRef.current); announceRef.current = null; }
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
          }
        }
        if (s === 'failed') {
          pc.restartIce();
          setTimeout(() => {
            if (mounted && pc.iceConnectionState === 'failed') {
              // Auto-end the call on failure
              cleanup();
              onLeave?.();
            }
          }, 6000);
        }
        if (s === 'disconnected') {
          // Partner's connection dropped — auto-end call after 5 seconds
          setTimeout(() => {
            if (mounted && pc.iceConnectionState === 'disconnected') {
              cleanup();
              onLeave?.();
            }
          }, 5000);
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
        if (!connectedRef.current) {
          setPartnerName(data.name || 'Study Buddy');
          setStatus('connecting');
        }
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
        if (!connectedRef.current) setPartnerName(data.name || 'Study Buddy');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          negotiatingRef.current = false;
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

      // ── Screen share signaling ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.on('broadcast', { event: 'screen-start' }, (msg: any) => {
        if (msg.payload.from === myId || !mounted) return;
        setPartnerScreenSharing(true);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.on('broadcast', { event: 'screen-stop' }, (msg: any) => {
        if (msg.payload.from === myId || !mounted) return;
        setPartnerScreenSharing(false);
      });

      // ── In-call chat ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel.on('broadcast', { event: 'chat' }, (msg: any) => {
        const data = msg.payload as ChatMsg;
        if (data.from === myId || !mounted) return;
        setChatMessages(prev => [...prev, data]);
        if (!showChatRef.current) setUnreadChat(prev => prev + 1);
      });

      // ── Subscribe & announce ──
      channel.subscribe((subStatus: string) => {
        if (subStatus === 'SUBSCRIBED' && mounted) {
          setStatus('waiting');
          // Announce presence every 2s (stops once connected)
          const announce = () => {
            channel.send({
              type: 'broadcast',
              event: 'join',
              payload: { from: myId, name: displayName },
            });
          };
          announce();
          announceRef.current = setInterval(announce, 2000);

          // ── Heartbeat: send 'ping' every 3s so partner can detect we're alive ──
          const heartbeat = setInterval(() => {
            if (!mounted) { clearInterval(heartbeat); return; }
            channel.send({ type: 'broadcast', event: 'ping', payload: { from: myId } }).catch(() => {});
          }, 3000);
          // Clear heartbeat on page hide
          const clearHeartbeat = () => clearInterval(heartbeat);
          window.addEventListener('pagehide', clearHeartbeat, { once: true });
        }
      });
    };

    // beforeunload + pagehide → auto-hangup when tab/browser closes
    const handleBeforeUnload = () => {
      // Use sendBeacon-style: try broadcast, it's best-effort on unload
      try {
        channelRef.current?.send({ type: 'broadcast', event: 'leave', payload: { from: myId } });
      } catch { /* best effort */ }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    init();

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      if (channelRef.current) {
        try {
          channelRef.current.send({ type: 'broadcast', event: 'leave', payload: { from: myId } });
        } catch { /* best effort */ }
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

  const toggleScreenShare = async () => {
    if (!pcRef.current || status !== 'connected') return;

    if (isScreenSharing) {
      // ── Stop screen share → swap back to camera ──
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoSender && cameraTrack) await videoSender.replaceTrack(cameraTrack);
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      channelRef.current?.send({ type: 'broadcast', event: 'screen-stop', payload: { from: myId } });
    } else {
      // ── Start screen share ──
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Handle browser's native "Stop sharing" button
        screenTrack.addEventListener('ended', async () => {
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
          if (sender && camTrack) await sender.replaceTrack(camTrack);
          screenStreamRef.current = null;
          setIsScreenSharing(false);
          channelRef.current?.send({ type: 'broadcast', event: 'screen-stop', payload: { from: myId } });
        });

        // Replace camera track with screen track on the sender
        const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
        setIsScreenSharing(true);
        channelRef.current?.send({ type: 'broadcast', event: 'screen-start', payload: { from: myId } });
      } catch {
        // User cancelled screen share picker
      }
    }
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !channelRef.current) return;
    const msg: ChatMsg = {
      id: `${myId}_${Date.now()}`,
      from: myId,
      name: displayName,
      text: chatInput.trim(),
      ts: Date.now(),
    };
    channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg });
    setChatMessages(prev => [...prev, msg]);
    setChatInput('');
  };

  const toggleChat = () => {
    setShowChat(prev => !prev);
    setUnreadChat(0);
  };

  const endCall = () => {
    // Send leave event multiple times for reliability (mobile networks can drop single messages)
    const ch = channelRef.current;
    if (ch) {
      ch.send({ type: 'broadcast', event: 'leave', payload: { from: myId } }).catch(() => {});
      setTimeout(() => ch.send({ type: 'broadcast', event: 'leave', payload: { from: myId } }).catch(() => {}), 100);
      setTimeout(() => ch.send({ type: 'broadcast', event: 'leave', payload: { from: myId } }).catch(() => {}), 300);
    }
    setTimeout(() => { cleanup(); onLeave?.(); }, 500);
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

      {/* Remote Video (shows camera or screen share via replaceTrack) */}
      {!audioOnly && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
            status === 'connected' ? 'opacity-100' : 'opacity-0'
          } ${partnerScreenSharing ? 'object-contain bg-black' : 'object-cover'}`}
        />
      )}

      {/* Screen share indicator — partner sharing */}
      {partnerScreenSharing && status === 'connected' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-blue-500/90 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-2 shadow-lg">
          📺 {partnerName} is sharing screen
        </div>
      )}

      {/* Screen share indicator — you sharing */}
      {isScreenSharing && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-red-500/90 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-2 shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white" />
          You are sharing your screen
        </div>
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

      {/* ── In-call Chat Panel ── */}
      {showChat && (
        <div className="absolute bottom-28 left-3 right-3 sm:left-auto sm:right-4 sm:w-80 z-30 bg-black/85 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col shadow-2xl" style={{ maxHeight: '50vh' }}>
          <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">💬 Chat</span>
            <button onClick={toggleChat} className="text-gray-400 hover:text-white text-sm transition-colors">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: '35vh', minHeight: '120px' }}>
            {chatMessages.length === 0 && (
              <p className="text-center text-xs text-gray-500 py-6">No messages yet. Say hi! 👋</p>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.from === myId ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  msg.from === myId
                    ? 'bg-[var(--primary)]/40 text-white rounded-br-md'
                    : 'bg-white/10 text-gray-200 rounded-bl-md'
                }`}>
                  {msg.from !== myId && <p className="font-semibold text-[var(--primary-light)] text-[10px] mb-0.5">{msg.name}</p>}
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-2 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
              placeholder="Type a message..."
              className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-[var(--primary)]/50"
              autoComplete="off"
            />
            <button
              onClick={sendChatMessage}
              disabled={!chatInput.trim()}
              className="px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-30 transition-opacity"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-3 sm:gap-4">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all shadow-lg ${
            isMuted ? 'bg-red-500 text-white ring-2 ring-red-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>

        {/* Camera toggle */}
        {!audioOnly && (
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all shadow-lg ${
              isVideoOff ? 'bg-red-500 text-white ring-2 ring-red-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? '📷' : '📹'}
          </button>
        )}

        {/* Screen share (video calls only, when connected) */}
        {!audioOnly && status === 'connected' && (
          <button
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all shadow-lg ${
              isScreenSharing ? 'bg-blue-500 text-white ring-2 ring-blue-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            🖥️
          </button>
        )}

        {/* Chat toggle (when connected) */}
        {status === 'connected' && (
          <button
            onClick={toggleChat}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all shadow-lg relative ${
              showChat ? 'bg-[var(--primary)] text-white ring-2 ring-purple-400/50' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
            }`}
            title="Chat"
          >
            💬
            {unreadChat > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold animate-bounce">
                {unreadChat > 9 ? '9+' : unreadChat}
              </span>
            )}
          </button>
        )}

        {/* End call */}
        <button
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center text-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/30 ring-2 ring-red-400/20 active:scale-95"
          title="End Call"
        >
          📞
        </button>
      </div>
    </div>
  );
}
