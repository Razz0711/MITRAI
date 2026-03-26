// ============================================
// MitrRAI - Typing Indicator (3 Bouncing Dots)
// Shows when someone is typing in chat
// ============================================

'use client';

export default function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-1" style={{ animation: 'fadeSlideUp 0.3s ease-out' }}>
      <div
        className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <span
          className="w-2 h-2 rounded-full bg-[var(--muted)]"
          style={{ animation: 'typingBounce 1.4s ease-in-out infinite' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-[var(--muted)]"
          style={{ animation: 'typingBounce 1.4s ease-in-out 0.2s infinite' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-[var(--muted)]"
          style={{ animation: 'typingBounce 1.4s ease-in-out 0.4s infinite' }}
        />
      </div>
      {name && (
        <span className="text-[10px] text-[var(--muted)]">{name} is typing...</span>
      )}
    </div>
  );
}
