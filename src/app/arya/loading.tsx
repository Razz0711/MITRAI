import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function AryaLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center" style={{ animation: 'float 3s ease-in-out infinite' }}>
          <span className="text-2xl">✨</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--foreground)]">Loading Arya...</p>
          <p className="text-xs text-[var(--muted)]">Your AI bestie is getting ready</p>
        </div>
      </div>
    </div>
  );
}
