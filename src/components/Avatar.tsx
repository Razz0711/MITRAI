'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
  isOnline?: boolean;
  showRing?: boolean;
}

export default function Avatar({ src, name, size = 32, className = '', fallbackClassName = '', isOnline = false, showRing = false }: AvatarProps) {
  const [error, setError] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  const ringStyle = showRing && isOnline ? {
    padding: '2px',
    background: 'linear-gradient(135deg, #7c3aed, #c026d3, #ea580c, #7c3aed)',
    backgroundSize: '300% 300%',
    animation: 'avatarRingRotate 3s linear infinite',
    borderRadius: '50%',
  } : undefined;

  const avatarContent = (!src || error) ? (
    <div 
      className={`rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold shrink-0 ${fallbackClassName || className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
    >
      {initial}
    </div>
  ) : (
    <Image 
      src={src} 
      alt={name || 'Avatar'} 
      width={size} 
      height={size} 
      className={`rounded-full object-cover shrink-0 ${className}`} 
      unoptimized 
      onError={() => setError(true)} 
    />
  );

  if (ringStyle) {
    return (
      <div style={ringStyle} className="shrink-0">
        <div style={{ borderRadius: '50%', background: 'var(--background)', padding: '1px' }}>
          {avatarContent}
        </div>
      </div>
    );
  }

  return avatarContent;
}
