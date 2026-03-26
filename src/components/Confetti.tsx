// ============================================
// MitrRAI - Confetti Celebration Component
// Triggers emoji burst on achievements
// ============================================

'use client';

import { useEffect, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  emoji: string;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

const CELEBRATION_EMOJIS: Record<string, string[]> = {
  post: ['📝', '🎉', '✨', '🔥', '💯'],
  friend: ['🤝', '💜', '🎊', '✨', '🥳'],
  match: ['💫', '🌟', '🎯', '✨', '🤩'],
  streak: ['🔥', '💪', '⚡', '🏆', '👑'],
  default: ['🎉', '✨', '🎊', '💫', '🥳'],
};

export function useConfetti() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(false);

  const celebrate = useCallback((type: string = 'default') => {
    const emojis = CELEBRATION_EMOJIS[type] || CELEBRATION_EMOJIS.default;
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: 10 + Math.random() * 80,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      size: 16 + Math.random() * 16,
      duration: 1.5 + Math.random() * 1.5,
      delay: Math.random() * 0.5,
      drift: -30 + Math.random() * 60,
    }));
    setParticles(newParticles);
    setActive(true);
    // Trigger haptic if available
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    setTimeout(() => { setActive(false); setParticles([]); }, 3500);
  }, []);

  return { celebrate, particles, active };
}

export default function ConfettiOverlay({ particles, active }: { particles: Particle[]; active: boolean }) {
  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: '-20px',
            fontSize: `${p.size}px`,
            animation: `confettiFly ${p.duration}s ease-out ${p.delay}s forwards`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}
