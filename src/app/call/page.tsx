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
  const [buddyOnline, setBuddyOnline] = useState<'online' | 'in-session' | 'offline' | null>(null);

  // Post-call rating
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(7);
  const [ratingReview, setRatingReview] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  // Friend request
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [sendingFriendReq, setSendingFriendReq] = useState(false);
  // Friendship check
  const [isAlreadyFriend, setIsAlreadyFriend] = useState(false);
  const [friendId, setFriendId] = useState('');

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
    const fId = params.get('friendId');

    if (mode) setCallMode(mode);
    if (room) setRoomCode(room);
    if (buddy) setBuddyName(buddy);
    if (fId) setFriendId(fId);

    // Auto-generate room code if coming from a link with mode but no room
    let autoRoom = room;
    if (mode && !room) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setRoomCode(code);
      autoRoom = code;
    }

    // Auto-start if all params are present (direct call from friends page)
    if (mode && (room || autoRoom) && savedName) {
      setIsInCall(true);
    }

    // Check if buddy is already a friend (to hide "Add Friend" in post-call)
    if (fId) {
      setIsAlreadyFriend(true); // Coming from friends page → already friends
    } else if (buddy) {
      try {
        const session = localStorage.getItem('mitrai_session');
        const userData = session ? JSON.parse(session) : null;
        if (userData?.id) {
          fetch(`/api/friends?userId=${userData.id}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data?.friends) {
                const found = data.data.friends.some((f: { user1Name: string; user2Name: string }) =>
                  f.user1Name.toLowerCase() === buddy.toLowerCase() ||
                  f.user2Name.toLowerCase() === buddy.toLowerCase()
                );
                if (found) setIsAlreadyFriend(true);
              }
            })
            .catch(() => {});
        }
      } catch { /* ok */ }
    }

    // Check buddy online status
    const checkBuddyStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const buddyTarget = buddy || savedBuddy;
          if (buddyTarget) {
            const found = data.data.find((s: { userName?: string; status: string }) =>
              s.userName?.toLowerCase() === buddyTarget.toLowerCase()
            );
            setBuddyOnline(found ? (found.status as 'online' | 'in-session' | 'offline') : 'offline');
          }
        }
      } catch (err) { console.error('checkBuddyStatus:', err); }
    };
    checkBuddyStatus();
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
    if (!callMode) return;
    if (!displayName.trim()) {
      // Try to get name from localStorage as fallback
      const savedName = localStorage.getItem('mitrai_student_name');
      if (savedName) {
        setDisplayName(savedName);
      } else {
        alert('Please enter your name before starting a call');
        return;
      }
    }
    if (!roomCode) {
      // Auto-generate if missing
      generateRoomCode();
      return;
    }
    setIsInCall(true);
  };

  const handleLeave = () => {
    setIsInCall(false);
    // Show post-call rating if we had a buddy
    if (buddyName) {
      setShowRating(true);
    } else {
      setCallMode(null);
    }
  };

  const handleSubmitRating = async () => {
    setSubmittingRating(true);
    try {
      // Get user info from localStorage
      const session = localStorage.getItem('mitrai_session');
      const userData = session ? JSON.parse(session) : null;
      if (userData) {
        await fetch('/api/friends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rate',
            fromUserId: userData.id,
            fromUserName: userData.name || displayName,
            toUserId: buddyName, // name-based lookup (server resolves)
            toUserName: buddyName,
            lookupByName: true,
            rating: ratingValue,
            review: ratingReview,
          }),
        });
      }
    } catch (err) { console.error('submitRating:', err); }
    setRatingSubmitted(true);
    setSubmittingRating(false);
    setTimeout(() => {
      setShowRating(false);
      setRatingSubmitted(false);
      setRatingValue(7);
      setRatingReview('');
      setCallMode(null);
    }, 2000);
  };

  const handleSendFriendRequest = async () => {
    setSendingFriendReq(true);
    try {
      const session = localStorage.getItem('mitrai_session');
      const userData = session ? JSON.parse(session) : null;
      if (userData) {
        await fetch('/api/friends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_request',
            fromUserId: userData.id,
            fromUserName: userData.name || displayName,
            toUserId: buddyName,
            toUserName: buddyName,
          }),
        });
        setFriendRequestSent(true);
      }
    } catch (err) { console.error('sendFriendRequest:', err); }
    setSendingFriendReq(false);
  };

  const skipRating = () => {
    setShowRating(false);
    setCallMode(null);
  };

  // Post-call rating modal
  if (showRating) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="card p-6 slide-up">
          {ratingSubmitted ? (
            <div className="text-center py-6">
              <span className="text-5xl mb-4 block">🎉</span>
              <h2 className="text-lg font-bold mb-2">Thank You!</h2>
              <p className="text-xs text-[var(--muted)]">Your rating has been recorded</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <span className="text-4xl mb-3 block">⭐</span>
                <h2 className="text-lg font-bold">Rate Your Session</h2>
                <p className="text-xs text-[var(--muted)] mt-1">
                  How was your experience with <strong className="text-[var(--primary-light)]">{buddyName}</strong>?
                </p>
              </div>

              {/* Rating Slider */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--muted)]">Rating</span>
                  <span className="text-2xl font-bold text-[var(--primary-light)]">{ratingValue}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={ratingValue}
                  onChange={(e) => setRatingValue(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[var(--primary)]"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[var(--muted)]">Poor</span>
                  <span className="text-[10px] text-[var(--muted)]">Great</span>
                </div>
                {/* Visual bar */}
                <div className="flex gap-1 mt-3 justify-center">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setRatingValue(i + 1)}
                      className={`w-6 h-8 rounded transition-all ${
                        i < ratingValue
                          ? ratingValue >= 8 ? 'bg-green-500' : ratingValue >= 5 ? 'bg-amber-500' : 'bg-red-500'
                          : 'bg-white/10'
                      } hover:scale-110`}
                    />
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div className="mb-6">
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Quick review (optional)</label>
                <textarea
                  value={ratingReview}
                  onChange={(e) => setRatingReview(e.target.value)}
                  placeholder="How was the study session? Any highlights?"
                  className="input-field resize-none h-20 text-xs"
                  maxLength={200}
                />
              </div>

              {/* Add Friend Button — hidden if already friends */}
              {!isAlreadyFriend && (
                <div className="mb-5 p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">Add {buddyName} as friend?</p>
                      <p className="text-[10px] text-[var(--muted)]">Stay connected for future sessions</p>
                    </div>
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={friendRequestSent || sendingFriendReq}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        friendRequestSent
                          ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                          : 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/30'
                      } disabled:opacity-70`}
                    >
                      {sendingFriendReq ? '...' : friendRequestSent ? '✓ Sent!' : '👋 Add Friend'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={skipRating}
                  className="btn-secondary flex-1 text-xs"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmitRating}
                  disabled={submittingRating}
                  className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

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
              <div className="flex items-center justify-between">
                <p className="text-xs">
                  Calling <strong className="text-[var(--primary-light)]">{buddyName}</strong> — 
                  share code <strong className="font-mono text-[var(--secondary)]">{roomCode || '...'}</strong>
                </p>
                {buddyOnline && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    buddyOnline === 'online' ? 'bg-green-500/15 text-green-400' :
                    buddyOnline === 'in-session' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-gray-500/15 text-gray-400'
                  }`}>
                    {buddyOnline === 'online' ? '🟢 Online' : buddyOnline === 'in-session' ? '📖 In Session' : '⚫ Offline'}
                  </span>
                )}
              </div>
              {buddyOnline === 'online' && (
                <p className="text-[10px] text-green-400 mt-1">Your buddy is online — great time to call!</p>
              )}
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
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-green-500/15 flex items-center justify-center text-xs font-bold text-green-400">
              ⚡
            </div>
            <p className="text-xs font-medium mb-0.5">Call from Friends</p>
            <p className="text-[10px] text-[var(--muted)]">Tap 🎤 or 📹 on a friend — instant call!</p>
          </div>
          <div className="text-center p-3">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-xs font-bold text-[var(--primary-light)]">
              🔗
            </div>
            <p className="text-xs font-medium mb-0.5">Or Use a Room Code</p>
            <p className="text-[10px] text-[var(--muted)]">Generate & share a code to call anyone</p>
          </div>
          <div className="text-center p-3">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-blue-500/15 flex items-center justify-center text-xs font-bold text-blue-400">
              🖥️
            </div>
            <p className="text-xs font-medium mb-0.5">Share & Chat</p>
            <p className="text-[10px] text-[var(--muted)]">Screen share + in-call chat built-in</p>
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
