// ============================================
// MitrAI - Voice/Video Call Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Jitsi
const CallRoom = dynamic(() => import('@/components/CallRoom'), { ssr: false });

export default function CallPage() {
  const [callMode, setCallMode] = useState<'voice' | 'video' | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isInCall, setIsInCall] = useState(false);
  const [buddyName, setBuddyName] = useState('');

  useEffect(() => {
    // Load saved user info
    const savedName = localStorage.getItem('mitrai_student_name') || '';
    const savedBuddy = localStorage.getItem('mitrai_buddy_name') || '';
    setDisplayName(savedName);
    setBuddyName(savedBuddy);

    // Check URL params for pre-filled room
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') as 'voice' | 'video' | null;
    const room = params.get('room');
    const buddy = params.get('buddy');

    if (mode) setCallMode(mode);
    if (room) setRoomCode(room);
    if (buddy) setBuddyName(buddy);

    // Auto-start if all params are present
    if (mode && room && savedName) {
      setIsInCall(true);
    }
  }, []);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomCode(code);
  };

  const startCall = () => {
    if (!roomCode || !displayName || !callMode) return;
    setIsInCall(true);
  };

  const handleLeave = () => {
    setIsInCall(false);
    setCallMode(null);
  };

  // In-call view
  if (isInCall && callMode && roomCode) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <CallRoom
          roomName={roomCode}
          displayName={displayName}
          audioOnly={callMode === 'voice'}
          onLeave={handleLeave}
        />
      </div>
    );
  }

  // Call setup view
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="gradient-text">Call Your Buddy</span> 📞
        </h1>
        <p className="text-[var(--muted)]">Start a voice or video call with your study partner</p>
      </div>

      {/* Call Mode Selection */}
      {!callMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setCallMode('voice')}
            className="glass-card-hover p-8 text-center group"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
              🎙️
            </div>
            <h3 className="text-xl font-bold mb-2">Voice Call</h3>
            <p className="text-sm text-[var(--muted)]">
              Audio-only call — great for discussing concepts, quick doubts, or revision sessions
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">Low bandwidth</span>
              <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">No camera needed</span>
            </div>
          </button>

          <button
            onClick={() => setCallMode('video')}
            className="glass-card-hover p-8 text-center group"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
              📹
            </div>
            <h3 className="text-xl font-bold mb-2">Video Call</h3>
            <p className="text-sm text-[var(--muted)]">
              Face-to-face video call — ideal for teaching, whiteboard sessions, and problem solving
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">Screen sharing</span>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">Face-to-face</span>
            </div>
          </button>
        </div>
      )}

      {/* Call Setup Form */}
      {callMode && (
        <div className="glass-card p-6 space-y-5 slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {callMode === 'voice' ? '🎙️ Voice Call' : '📹 Video Call'} Setup
            </h2>
            <button
              onClick={() => setCallMode(null)}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              ← Change mode
            </button>
          </div>

          {/* Display Name */}
          <div>
            <label className="text-sm text-[var(--muted)] mb-1 block">Your Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name..."
              className="input-field"
            />
          </div>

          {/* Room Code */}
          <div>
            <label className="text-sm text-[var(--muted)] mb-1 block">Room Code *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code or generate one..."
                className="input-field flex-1 uppercase tracking-widest text-center text-lg font-mono"
                maxLength={10}
              />
              <button
                onClick={generateRoomCode}
                className="btn-secondary whitespace-nowrap"
              >
                🎲 Generate
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              Share this code with your study buddy so they can join the same room
            </p>
          </div>

          {/* Buddy Info */}
          {buddyName && (
            <div className="p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
              <p className="text-sm">
                🤝 Calling <strong className="text-[var(--primary-light)]">{buddyName}</strong> — 
                share the room code <strong className="font-mono text-[var(--secondary)]">{roomCode || '...'}</strong> with them
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="p-4 rounded-xl bg-white/5 space-y-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">💡 Quick Tips</p>
            <ul className="text-sm text-[var(--muted)] space-y-1">
              <li>• Use headphones for better audio quality</li>
              <li>• Find a quiet spot for your study session</li>
              {callMode === 'video' && <li>• Good lighting helps your buddy see you clearly</li>}
              <li>• You can share your screen to show problems/solutions</li>
              <li>• Both buddies need the same room code to connect</li>
            </ul>
          </div>

          {/* Start Call Button */}
          <button
            onClick={startCall}
            disabled={!roomCode || !displayName}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all duration-300 ${
              callMode === 'voice'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg hover:shadow-green-500/30'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg hover:shadow-blue-500/30'
            } text-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {callMode === 'voice' ? '🎙️ Start Voice Call' : '📹 Start Video Call'}
          </button>
        </div>
      )}

      {/* How It Works */}
      <div className="mt-8 glass-card p-6">
        <h3 className="text-lg font-bold mb-4 text-center">How Calling Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-2xl">
              1️⃣
            </div>
            <p className="text-sm font-medium mb-1">Generate a Room Code</p>
            <p className="text-xs text-[var(--muted)]">Create a unique code for your study session</p>
          </div>
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-2xl">
              2️⃣
            </div>
            <p className="text-sm font-medium mb-1">Share with Your Buddy</p>
            <p className="text-xs text-[var(--muted)]">Send the room code to your matched study partner</p>
          </div>
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-2xl">
              3️⃣
            </div>
            <p className="text-sm font-medium mb-1">Study Together!</p>
            <p className="text-xs text-[var(--muted)]">Both enter the same code and start learning</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '🖥️', label: 'Screen Share', desc: 'Show your work' },
          { icon: '💬', label: 'In-call Chat', desc: 'Text alongside' },
          { icon: '🔇', label: 'Mute/Unmute', desc: 'Quick controls' },
          { icon: '🌐', label: 'No Install', desc: 'Works in browser' },
        ].map((f) => (
          <div key={f.label} className="glass-card p-3 text-center">
            <div className="text-2xl mb-1">{f.icon}</div>
            <p className="text-xs font-medium">{f.label}</p>
            <p className="text-[10px] text-[var(--muted)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
