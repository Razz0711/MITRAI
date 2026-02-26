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
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-1">
          <span className="gradient-text">Call Your Buddy</span>
        </h1>
        <p className="text-xs text-[var(--muted)]">Start a voice or video call with your study partner</p>
      </div>

      {/* Call Mode Selection */}
      {!callMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setCallMode('voice')}
            className="card-hover p-6 text-center group"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center text-sm font-bold text-green-400 group-hover:scale-110 transition-transform">
              MIC
            </div>
            <h3 className="text-sm font-semibold mb-1">Voice Call</h3>
            <p className="text-xs text-[var(--muted)]">
              Audio-only. Great for discussing concepts and revision.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              <span className="badge-success text-[10px]">Low bandwidth</span>
              <span className="badge-success text-[10px]">No camera</span>
            </div>
          </button>

          <button
            onClick={() => setCallMode('video')}
            className="card-hover p-6 text-center group"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-sm font-bold text-blue-400 group-hover:scale-110 transition-transform">
              CAM
            </div>
            <h3 className="text-sm font-semibold mb-1">Video Call</h3>
            <p className="text-xs text-[var(--muted)]">
              Face-to-face. Ideal for teaching and problem solving.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
              <span className="badge-primary text-[10px]">Screen sharing</span>
              <span className="badge-primary text-[10px]">Face-to-face</span>
            </div>
          </button>
        </div>
      )}

      {/* Call Setup Form */}
      {callMode && (
        <div className="card p-4 space-y-4 slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {callMode === 'voice' ? 'Voice Call' : 'Video Call'} Setup
            </h2>
            <button
              onClick={() => setCallMode(null)}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Change mode
            </button>
          </div>

          {/* Display Name */}
          <div>
            <label className="label">Your Name *</label>
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
            <label className="label">Room Code *</label>
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
                className="btn-secondary whitespace-nowrap text-xs"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] mt-1">
              Share this code with your study buddy so they can join the same room
            </p>
          </div>

          {/* Buddy Info */}
          {buddyName && (
            <div className="p-2.5 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
              <p className="text-xs">
                Calling <strong className="text-[var(--primary-light)]">{buddyName}</strong> — 
                share code <strong className="font-mono text-[var(--secondary)]">{roomCode || '...'}</strong>
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="p-3 rounded-lg bg-white/5 space-y-1">
            <p className="text-xs font-semibold text-[var(--foreground)]">Tips</p>
            <ul className="text-xs text-[var(--muted)] space-y-0.5">
              <li>Use headphones for better audio</li>
              <li>Find a quiet spot</li>
              {callMode === 'video' && <li>Good lighting helps</li>}
              <li>Both buddies need the same room code</li>
            </ul>
          </div>

          {/* Start Call Button */}
          <button
            onClick={startCall}
            disabled={!roomCode || !displayName}
            className={`w-full py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${
              callMode === 'voice'
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg hover:shadow-green-500/20'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg hover:shadow-blue-500/20'
            } text-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            {callMode === 'voice' ? 'Start Voice Call' : 'Start Video Call'}
          </button>
        </div>
      )}

      {/* How It Works */}
      <div className="mt-6 card p-4">
        <h3 className="text-sm font-semibold mb-3 text-center">How Calling Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="text-center p-3">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-xs font-bold text-[var(--primary-light)]">
              1
            </div>
            <p className="text-xs font-medium mb-0.5">Generate a Room Code</p>
            <p className="text-[10px] text-[var(--muted)]">Create a unique code for your session</p>
          </div>
          <div className="text-center p-3">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-xs font-bold text-[var(--primary-light)]">
              2
            </div>
            <p className="text-xs font-medium mb-0.5">Share with Buddy</p>
            <p className="text-[10px] text-[var(--muted)]">Send the code to your study partner</p>
          </div>
          <div className="text-center p-3">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-xs font-bold text-[var(--primary-light)]">
              3
            </div>
            <p className="text-xs font-medium mb-0.5">Study Together</p>
            <p className="text-[10px] text-[var(--muted)]">Both enter the same code and start</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Screen Share', desc: 'Show your work' },
          { label: 'In-call Chat', desc: 'Text alongside' },
          { label: 'Mute/Unmute', desc: 'Quick controls' },
          { label: 'No Install', desc: 'Works in browser' },
        ].map((f) => (
          <div key={f.label} className="card p-2.5 text-center">
            <p className="text-xs font-medium">{f.label}</p>
            <p className="text-[10px] text-[var(--muted)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
