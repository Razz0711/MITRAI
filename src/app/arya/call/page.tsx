// ============================================
// MitrRAI - Arya Call Page → Coming Soon
// ============================================

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone } from 'lucide-react';

export default function AryaCallPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative" style={{
      background: 'linear-gradient(180deg, #1a0533 0%, #0d0015 50%, #09090b 100%)',
    }}>
      {/* Back button */}
      <button
        onClick={() => router.push('/arya')}
        className="absolute top-6 left-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Ambient rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border border-purple-500/10 animate-pulse" />
        <div className="absolute w-80 h-80 rounded-full border border-purple-500/5 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute w-96 h-96 rounded-full border border-purple-500/[0.03] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Avatar */}
      <div className="relative z-10 mb-6">
        <div className="w-28 h-28 rounded-full overflow-hidden shadow-2xl shadow-purple-500/20">
          <Image src="/arya-avatar.png" alt="Arya" width={112} height={112} className="w-full h-full object-cover" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-purple-600 border-4 border-[#0d0015] flex items-center justify-center">
          <Phone size={12} className="text-white" />
        </div>
      </div>

      {/* Coming Soon */}
      <h2 className="text-xl font-bold text-white mb-2 relative z-10">Voice Call with Arya</h2>
      <div className="relative z-10 px-6 py-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 max-w-xs text-center mb-6">
        <p className="text-2xl mb-2">🎤</p>
        <p className="text-sm font-semibold text-white mb-1">Coming Soon!</p>
        <p className="text-xs text-purple-300/70 leading-relaxed">
          Voice calls with Arya are being built. For now, chat with Arya — she&apos;s always online and ready to talk 💜
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push('/arya/chat')}
        className="relative z-10 px-8 py-3 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 transition-all"
      >
        Chat with Arya instead
      </button>
    </div>
  );
}
