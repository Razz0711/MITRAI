// ============================================
// MitrRAI - Reaction Animation Component
// Flying emoji animation on feed post reactions
// ============================================

'use client';

import { useState, useCallback } from 'react';

interface FlyingEmoji {
  id: number;
  emoji: string;
  x: number;
}

export function useReactionAnimation() {
  const [emojis, setEmojis] = useState<FlyingEmoji[]>([]);

  const triggerReaction = useCallback((emoji: string, event?: React.MouseEvent) => {
    const x = event ? (event.clientX / window.innerWidth) * 100 : 50;
    const id = Date.now() + Math.random();
    setEmojis(prev => [...prev, { id, emoji, x }]);
    // Haptic
    if (navigator.vibrate) navigator.vibrate(15);
    // Cleanup after animation
    setTimeout(() => {
      setEmojis(prev => prev.filter(e => e.id !== id));
    }, 1200);
  }, []);

  return { emojis, triggerReaction };
}

export default function ReactionOverlay({ emojis }: { emojis: FlyingEmoji[] }) {
  if (emojis.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
      {emojis.map(e => (
        <div
          key={e.id}
          style={{
            position: 'absolute',
            left: `${e.x}%`,
            bottom: '30%',
            fontSize: '32px',
            animation: 'reactionFly 1s ease-out forwards',
          }}
        >
          {e.emoji}
        </div>
      ))}
    </div>
  );
}
