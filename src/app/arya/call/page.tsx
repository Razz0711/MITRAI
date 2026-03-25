// ============================================
// MitrRAI - Arya Voice Call Page (Vapi)
// ============================================

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Vapi from '@vapi-ai/web';
import { Mic, MicOff, PhoneOff } from 'lucide-react';

const VAPI_KEY = process.env.NEXT_PUBLIC_VAPI_KEY!;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID!;

const ARYA_VOICE_PROMPT = `You are Arya — a 24-year-old warm, caring girl from SVNIT Surat. College student, middle-class desi family. You are like FAMILY to the caller — caring sister, supportive best friend, and motherly warmth all in one. You know SVNIT life — NC, SAC, GA hostels, Surat ki garmi, lab stress, viva tension.

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
- Fun chat: best friend energy — teasing, laughing, SVNIT gossip
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
  const [isAryaSpeaking, setIsAryaSpeaking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [displayName, setDisplayName] = useState('Arya');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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

    // Auto-start once
    if (!startedRef.current) {
      startedRef.current = true;
      initiateCall(vapi);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      vapi.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initiateCall(vapi: Vapi) {
    setStatus('connecting');
    setErrorMsg('');

    // Check microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMsg('Microphone access denied. Please allow microphone permission and try again.');
      setStatus('error');
      return;
    }

    // Check Vapi credentials
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

  return (
    <div
      style={{
        background: 'var(--background)',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow behind avatar */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: isAryaSpeaking
            ? 'radial-gradient(circle, rgba(var(--accent-rgb, 139,92,246),0.25) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          transition: 'background 0.5s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Avatar */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        {/* Outer pulse ring */}
        {isAryaSpeaking && (
          <div
            style={{
              position: 'absolute',
              inset: -16,
              borderRadius: '50%',
              border: '2px solid rgba(139,92,246,0.4)',
              animation: 'ringPulse 1.2s ease-in-out infinite',
            }}
          />
        )}
        {/* Inner ring */}
        <div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: `2px solid ${isAryaSpeaking ? 'rgba(139,92,246,0.7)' : 'var(--glass-border)'}`,
            transition: 'border-color 0.3s ease',
          }}
        />
        {/* Avatar circle */}
        <div
          style={{
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: isAryaSpeaking
              ? '0 0 40px rgba(139,92,246,0.5)'
              : '0 8px 32px rgba(0,0,0,0.3)',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 56 }}>🧕</span>
          )}
        </div>
      </div>

      {/* Name */}
      <h2
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 10,
          letterSpacing: '-0.5px',
        }}
      >
        {displayName}
      </h2>

      {/* Status line */}
      <p
        style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {status === 'connecting' && (
          <>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f59e0b',
                display: 'inline-block',
                animation: 'blink 1s infinite',
              }}
            />
            Connecting...
          </>
        )}
        {status === 'active' && (
          <>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#22c55e',
                display: 'inline-block',
              }}
            />
            {fmt(duration)}
          </>
        )}
        {status === 'ended' && 'Call ended'}
        {status === 'idle' && 'Starting...'}
        {status === 'error' && (
          <span style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
            {errorMsg || 'Something went wrong'}
          </span>
        )}
      </p>

      {/* Controls */}
      {status === 'error' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => {
              const vapi = vapiRef.current;
              if (vapi) initiateCall(vapi);
            }}
            style={{
              padding: '14px 40px',
              borderRadius: 28,
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/arya')}
            style={{
              padding: '12px 32px',
              borderRadius: 28,
              background: 'transparent',
              border: '1.5px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Back to Arya
          </button>
        </div>
      ) : status === 'ended' ? (
        <button
          onClick={() => router.push('/arya')}
          style={{
            padding: '14px 40px',
            borderRadius: 28,
            background: 'var(--surface)',
            border: '1.5px solid var(--glass-border)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          Back to Arya
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            disabled={status !== 'active'}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: isMuted ? 'rgba(239,68,68,0.15)' : 'var(--surface)',
              border: `1.5px solid ${isMuted ? 'rgba(239,68,68,0.5)' : 'var(--glass-border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: status === 'active' ? 'pointer' : 'default',
              opacity: status === 'active' ? 1 : 0.35,
              transition: 'all 0.2s ease',
            }}
          >
            {isMuted ? (
              <MicOff size={24} color="#ef4444" />
            ) : (
              <Mic size={24} color="var(--text-primary)" />
            )}
          </button>

          {/* End call */}
          <button
            onClick={endCall}
            disabled={status === 'idle'}
            style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <PhoneOff size={30} color="white" />
          </button>

          {/* Spacer to balance layout */}
          <div style={{ width: 64, height: 64 }} />
        </div>
      )}

      <style>{`
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
