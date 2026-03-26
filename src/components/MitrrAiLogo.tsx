// ============================================
// MitrRAI - Shared SVG Logo Component
// Crisp at any size, no quality loss
// ============================================

export default function MitrrAiLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mitrrai-logo-grad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="45%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="16" fill="url(#mitrrai-logo-grad)" />
      {/* Infinity loop — two people connected */}
      <path
        d="M28,28 C26,23 22,19 17,19 C11,19 7,23 7,28 C7,33 11,37 17,37 C22,37 26,33 28,28 C30,23 34,19 39,19 C45,19 49,23 49,28 C49,33 45,37 39,37 C34,37 30,33 28,28 Z"
        stroke="white" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.95"
      />
      <circle cx="28" cy="28" r="2.5" fill="white" />
    </svg>
  );
}
