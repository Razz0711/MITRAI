'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  fallbackClassName?: string;
}

export default function Avatar({ src, name, size = 32, className = '', fallbackClassName = '' }: AvatarProps) {
  const [error, setError] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  if (!src || error) {
    return (
      <div 
        className={`rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold shrink-0 ${fallbackClassName || className}`}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      >
        {initial}
      </div>
    );
  }

  return (
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
}
