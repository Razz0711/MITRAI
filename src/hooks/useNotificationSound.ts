// ============================================
// MitrAI - Notification Sound Hook
// Web Audio API — zero external files needed.
// Three tiers: urgent (double chime), important (soft chime), info (subtle pop)
// ============================================

'use client';

import { useCallback, useRef } from 'react';

type SoundType = 'urgent' | 'important' | 'info' | 'message' | 'call' | 'match';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not supported');
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// ── Tone generators ──────────────────────────────────

function playTone(ctx: AudioContext, freq: number, duration: number, startTime: number, volume = 0.15, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// ── Sound presets ────────────────────────────────────

function playUrgentSound(ctx: AudioContext) {
  // Double ascending chime — high urgency
  const now = ctx.currentTime;
  playTone(ctx, 880, 0.15, now, 0.18, 'sine');       // A5
  playTone(ctx, 1100, 0.15, now + 0.12, 0.18, 'sine'); // ~C#6
  playTone(ctx, 880, 0.15, now + 0.35, 0.15, 'sine');
  playTone(ctx, 1100, 0.15, now + 0.47, 0.15, 'sine');
}

function playImportantSound(ctx: AudioContext) {
  // Single soft ascending chime — friendly notification
  const now = ctx.currentTime;
  playTone(ctx, 523, 0.12, now, 0.13, 'sine');       // C5
  playTone(ctx, 659, 0.12, now + 0.08, 0.13, 'sine'); // E5
  playTone(ctx, 784, 0.2, now + 0.16, 0.1, 'sine');  // G5
}

function playInfoSound(ctx: AudioContext) {
  // Subtle single pop
  const now = ctx.currentTime;
  playTone(ctx, 660, 0.08, now, 0.08, 'sine');
}

function playMessageSound(ctx: AudioContext) {
  // Two-note "ding" for chat messages
  const now = ctx.currentTime;
  playTone(ctx, 587, 0.1, now, 0.12, 'sine');        // D5
  playTone(ctx, 784, 0.15, now + 0.08, 0.1, 'sine'); // G5
}

function playCallSound(ctx: AudioContext) {
  // Ringtone-style repeating tones (3 pulses)
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.3;
    playTone(ctx, 740, 0.12, t, 0.16, 'sine');
    playTone(ctx, 932, 0.12, t + 0.06, 0.14, 'sine');
  }
}

function playMatchSound(ctx: AudioContext) {
  // Celebratory ascending arpeggio — match/anon partner found
  const now = ctx.currentTime;
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    playTone(ctx, freq, 0.18, now + i * 0.1, 0.12, 'sine');
  });
}

// ── Main hook ────────────────────────────────────────

export function useNotificationSound() {
  // Throttle: don't spam sounds within 500ms
  const lastPlayed = useRef<number>(0);

  const play = useCallback((type: SoundType = 'info') => {
    const now = Date.now();
    if (now - lastPlayed.current < 500) return;
    lastPlayed.current = now;

    const ctx = getAudioContext();
    if (!ctx) return;

    switch (type) {
      case 'urgent':
        playUrgentSound(ctx);
        break;
      case 'important':
        playImportantSound(ctx);
        break;
      case 'info':
        playInfoSound(ctx);
        break;
      case 'message':
        playMessageSound(ctx);
        break;
      case 'call':
        playCallSound(ctx);
        break;
      case 'match':
        playMatchSound(ctx);
        break;
    }
  }, []);

  return { play };
}

// Static utility for non-component code (e.g., callbacks)
export function playNotificationSound(type: SoundType = 'info') {
  const ctx = getAudioContext();
  if (!ctx) return;
  switch (type) {
    case 'urgent': playUrgentSound(ctx); break;
    case 'important': playImportantSound(ctx); break;
    case 'info': playInfoSound(ctx); break;
    case 'message': playMessageSound(ctx); break;
    case 'call': playCallSound(ctx); break;
    case 'match': playMatchSound(ctx); break;
  }
}
