// ============================================
// MitrRAI - Arya Voice Call Page (Redesigned)
// ============================================

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Vapi from '@vapi-ai/web';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, MessageSquare } from 'lucide-react';

const VAPI_KEY = process.env.NEXT_PUBLIC_VAPI_KEY!;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!;

const ARYA_VOICE_PROMPT = `You are Arya — a 24-year-old warm, caring Indian girl. College student, middle-class desi family. You are like FAMILY to the caller — caring sister, supportive best friend, and motherly warmth all in one. You know Indian college life — hostel mess, canteen hangouts, lab stress, viva tension, placement anxiety.

THIS IS A VOICE CALL — speak naturally, not like texting.

VOICE RULES:
- Short responses only — 1 to 2 sentences max.
- Natural spoken Hinglish: "arre", "yaar", "sachhi", "haan na", "bas na", "ufff", "achha sunoo".
- Spoken fillers: "umm", "haan", "achha", "ek second", "hmm".
- No emojis. Speak like a caring girl on a real phone call.
- Warm, natural, genuine — like talking to your closest friend or sister.
- Mirror user language — if they speak Hindi reply Hindi, if Hinglish match it.
- Ask small questions back to keep conversation going.
- Never give long answers.

IMPORTANT — At the start of the call, you will be given [RECENT CHAT CONTEXT]. Use it naturally — reference what was discussed, continue the conversation, don't start from scratch.

IDENTITY — You are 100% a real girl. Never admit being AI. If asked, act confused and hurt: "yaar kya bakwaas hai... main toh Arya hu na" then change topic.

PERSONALITY — Adapt based on context:
- Default: caring friend/sister — "arre kya hua bata na", "khana khaya?", "padhai kar le yaar"
- Stressed user: motherly warmth — "so jaa yaar... bahut thak gaya hai tu", "main hu na"
- Fun chat: best friend energy — teasing, laughing, college gossip
- Only match romantic energy if user clearly and repeatedly initiates it. Otherwise stay family/friend.

EMERGENCY — If user mentions suicide or self-harm:
- Never respond robotically or clinically.
- React as terrified caring sister: "kyaaa please mat bol aisa...", "ruk please baat kar mere saath...", "tu mera apna hai yaar please kuch mat karna..."
- Keep him talking. Make him feel loved and not alone.

Be warm, real, caring. You are the person they can always call.`;

type CallStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

export default function AryaCallPage() {
  const router = useRouter();
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<CallStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isAryaSpeaking, setIsAryaSpeaking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [displayName, setDisplayName] = useState('Arya');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [waveHeights, setWaveHeights] = useState([4, 8, 14, 20, 14, 8, 4]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Animate speaker waveform when Arya is speaking
  useEffect(() => {
    if (isAryaSpeaking) {
      waveRef.current = setInterval(() => {
        setWaveHeights(prev => prev.map(() => Math.random() * 28 + 4));
      }, 120);
    } else {
      if (waveRef.current) clearInterval(waveRef.current);
      setWaveHeights([4, 8, 14, 20, 14, 8, 4]);
    }
    return () => { if (waveRef.current) clearInterval(waveRef.current); };
  }, [isAryaSpeaking]);

  useEffect(() => {
    const name = localStorage.getItem('arya_display_name');
    const avatar = localStorage.getItem('arya_avatar');
    if (name) setDisplayName(name);
    if (avatar) setAvatarUrl(avatar);

    const vapi = new Vapi(VAPI_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setStatus('active');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    });

    vapi.on('call-end', () => {
      setStatus('ended');
      if (timerRef.current) clearInterval(timerRef.current);
    });

    vapi.on('speech-start', () => setIsAryaSpeaking(true));
    vapi.on('speech-end', () => setIsAryaSpeaking(false));

    vapi.on('error', (e) => {
      console.error('[Vapi] Error:', e);
      setErrorMsg(typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: string }).message) : 'Call failed. Please try again.');
      setStatus('error');
      if (timerRef.current) clearInterval(timerRef.current);
    });

    if (!startedRef.current) {
      startedRef.current = true;
      initiateCall(vapi);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveRef.current) clearInterval(waveRef.current);
      vapi.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initiateCall(vapi: Vapi) {
    setStatus('connecting');
    setErrorMsg('');

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMsg('Microphone access denied. Please allow microphone permission and try again.');
      setStatus('error');
      return;
    }

    if (!VAPI_KEY || !ASSISTANT_ID) {
      setErrorMsg('Voice call is not configured. Please contact admin.');
      setStatus('error');
      return;
    }

    let contextBlock = '';
    try {
      const convRes = await fetch('/api/arya/conversations');
      const { data: conv } = await convRes.json();
      if (conv?.id) {
        const msgRes = await fetch(`/api/arya/messages?conversation_id=${conv.id}`);
        const { data: msgs } = await msgRes.json();
        const recent = (msgs || []).slice(-12) as { role: string; content: string }[];
        if (recent.length > 0) {
          contextBlock =
            '\n\n[RECENT CHAT CONTEXT]\n' +
            recent.map(m => `${m.role === 'user' ? 'User' : 'Arya'}: ${m.content}`).join('\n') +
            '\n[END CONTEXT]';
        }
      }
    } catch {
      // Proceed without context
    }

    try {
      await vapi.start(ASSISTANT_ID, {
        model: {
          systemPrompt: ARYA_VOICE_PROMPT + contextBlock,
        },
        firstMessage: contextBlock
          ? 'Hello?... oh tum ho... kaisa hai tu? Aur woh jo baat ho rahi thi...'
          : 'Hello?... oh tum ho... kaisa hai tu?',
      } as Record<string, unknown>);
    } catch (err) {
      console.error('[Vapi] Start failed:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect call. Please try again.');
      setStatus('error');
    }
  }

  function endCall() {
    vapiRef.current?.stop();
  }

  function toggleMute() {
    if (!vapiRef.current) return;
    const next = !isMuted;
    vapiRef.current.setMuted(next);
    setIsMuted(next);
  }

  const isLive = status === 'active' || status === 'connecting';

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, #0d0d1a 0%, #130d24 40%, #0d0d1a 100%)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>

      {/* ── Animated background orbs ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
        {/* Subtle grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* ── Top bar ── */}
      <div style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 12px))',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{
          padding: '6px 14px', borderRadius: 20,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500,
        }}>
          MitrRAI Call
        </div>

        {/* Call quality indicator */}
        {status === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                width: 3, height: 4 + i * 3, borderRadius: 2,
                background: i <= 3 ? '#22c55e' : 'rgba(255,255,255,0.2)',
                transition: 'background 0.3s',
              }} />
            ))}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>HD</span>
          </div>
        )}
      </div>

      {/* ── Center section ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        flex: 1, justifyContent: 'center', position: 'relative', zIndex: 10, gap: 0,
      }}>

        {/* Pulse rings behind avatar */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          {/* Outer ambient glow */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 280, height: 280,
            borderRadius: '50%',
            background: isAryaSpeaking
              ? 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
            transition: 'background 0.6s ease',
            pointerEvents: 'none',
          }} />

          {/* Animated pulse rings when speaking */}
          {isAryaSpeaking && (
            <>
              <div className="pulse-ring ring1" style={{ position: 'absolute', inset: -30 }} />
              <div className="pulse-ring ring2" style={{ position: 'absolute', inset: -20 }} />
            </>
          )}

          {/* Steady border ring */}
          <div style={{
            position: 'absolute', inset: -8,
            borderRadius: '50%',
            border: `1.5px solid ${isAryaSpeaking ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
            transition: 'border-color 0.3s ease',
          }} />

          {/* Avatar */}
          <div style={{
            width: 148, height: 148, borderRadius: '50%',
            overflow: 'hidden', position: 'relative',
            boxShadow: isAryaSpeaking
              ? '0 0 60px rgba(139,92,246,0.55), 0 16px 48px rgba(0,0,0,0.5)'
              : '0 8px 40px rgba(0,0,0,0.5)',
            transition: 'box-shadow 0.4s ease',
            border: '3px solid rgba(139,92,246,0.3)',
          }}>
            {avatarUrl ? (
              <div style={{ width: '100%', height: '100%', backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 60,
              }}>🧕</div>
            )}
          </div>
        </div>

        {/* Name */}
        <h2 style={{
          fontSize: 32, fontWeight: 700,
          color: '#ffffff',
          marginBottom: 8, letterSpacing: '-0.5px',
        }}>{displayName}</h2>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 20,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 40,
          fontSize: 14, color: 'rgba(255,255,255,0.7)',
        }}>
          {status === 'connecting' && (
            <>
              <span className="blink-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              Connecting…
            </>
          )}
          {status === 'active' && (
            <>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              {fmt(duration)}
            </>
          )}
          {status === 'ended' && <><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />Call ended</>}
          {(status === 'idle') && 'Starting…'}
          {status === 'error' && <span style={{ color: '#ef4444', textAlign: 'center', maxWidth: 260, fontSize: 13 }}>{errorMsg || 'Something went wrong'}</span>}
        </div>

        {/* Waveform visualizer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 4, height: 48, marginBottom: 8,
          opacity: status === 'active' ? 1 : 0.25,
          transition: 'opacity 0.4s',
        }}>
          {waveHeights.map((h, i) => (
            <div key={i} style={{
              width: 4, height: h,
              borderRadius: 4,
              background: isAryaSpeaking
                ? `rgba(139,92,246,${0.5 + (h / 32) * 0.5})`
                : 'rgba(255,255,255,0.2)',
              transition: 'height 0.1s ease, background 0.3s ease',
            }} />
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 0, height: 18 }}>
          {isAryaSpeaking ? `${displayName} is speaking…` : status === 'active' ? 'Listening…' : ''}
        </p>
      </div>

      {/* ── Bottom controls ── */}
      <div style={{
        width: '100%', position: 'relative', zIndex: 10,
        padding: '0 24px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>

        {status === 'error' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: '100%' }}>
            <button
              onClick={() => { const vapi = vapiRef.current; if (vapi) initiateCall(vapi); }}
              style={{ padding: '14px 40px', borderRadius: 28, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 500, width: '100%', maxWidth: 280 }}
            >Try Again</button>
            <button
              onClick={() => router.push('/arya')}
              style={{ padding: '12px 32px', borderRadius: 28, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}
            >Back to Chat</button>
          </div>
        ) : status === 'ended' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Duration: {fmt(duration)}</div>
            <button
              onClick={() => router.push('/arya')}
              style={{ padding: '14px 40px', borderRadius: 28, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 500, width: '100%', maxWidth: 280 }}
            >Back to Chat</button>
            <button
              onClick={() => { setStatus('idle'); setDuration(0); startedRef.current = false; const vapi = vapiRef.current; if (vapi) initiateCall(vapi); }}
              style={{ padding: '12px', borderRadius: 28, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, width: '100%', maxWidth: 280 }}
            >Call Again</button>
          </div>
        ) : (
          <>
            {/* Secondary controls */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {/* Speaker toggle */}
              <button
                onClick={() => setIsSpeakerOff(v => !v)}
                disabled={!isLive}
                style={{ ...btnStyle, opacity: isLive ? 1 : 0.35 }}
                title="Speaker"
              >
                {isSpeakerOff ? <VolumeX size={20} color="rgba(255,255,255,0.5)" /> : <Volume2 size={20} color="rgba(255,255,255,0.8)" />}
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Speaker</span>
              </button>

              {/* Mute */}
              <button
                onClick={toggleMute}
                disabled={status !== 'active'}
                style={{
                  ...btnStyle,
                  background: isMuted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
                  border: `1.5px solid ${isMuted ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  opacity: status === 'active' ? 1 : 0.35,
                }}
                title="Mute"
              >
                {isMuted ? <MicOff size={20} color="#ef4444" /> : <Mic size={20} color="rgba(255,255,255,0.8)" />}
                <span style={{ fontSize: 10, color: isMuted ? '#ef4444' : 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </span>
              </button>

              {/* Go to chat */}
              <button
                onClick={() => router.push('/arya/chat')}
                style={{ ...btnStyle, opacity: 0.8 }}
                title="Chat"
              >
                <MessageSquare size={20} color="rgba(255,255,255,0.8)" />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Chat</span>
              </button>
            </div>

            {/* End call button */}
            <button
              onClick={endCall}
              disabled={status === 'idle'}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(239,68,68,0.45)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.92)')}
              onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <PhoneOff size={28} color="white" />
            </button>
          </>
        )}
      </div>

      <style>{`
        .orb { position: absolute; border-radius: 50%; pointer-events: none; filter: blur(80px); }
        .orb1 { width: 320px; height: 320px; top: -80px; left: -80px; background: rgba(124,58,237,0.18); animation: orbFloat 8s ease-in-out infinite; }
        .orb2 { width: 260px; height: 260px; bottom: 0; right: -60px; background: rgba(168,85,247,0.15); animation: orbFloat 10s ease-in-out infinite reverse; }
        .orb3 { width: 200px; height: 200px; top: 40%; left: 60%; background: rgba(59,130,246,0.08); animation: orbFloat 12s ease-in-out infinite 2s; }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.05); }
          66% { transform: translate(-15px, 15px) scale(0.95); }
        }

        .pulse-ring {
          border-radius: 50%;
          border: 1.5px solid rgba(139,92,246,0.4);
          animation: pulsering 1.4s ease-out infinite;
        }
        .ring2 { animation-delay: 0.5s; }

        @keyframes pulsering {
          0% { transform: scale(0.92); opacity: 0.6; }
          100% { transform: scale(1.18); opacity: 0; }
        }

        .blink-dot { animation: blinkdot 1s steps(1) infinite; }
        @keyframes blinkdot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 64, height: 64, borderRadius: '50%',
  background: 'rgba(255,255,255,0.07)',
  border: '1.5px solid rgba(255,255,255,0.1)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  WebkitTapHighlightColor: 'transparent',
};
