// ============================================
// MitrRAI - Global Friend Request Popup
// Displays actionable friend requests across the whole app
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { FriendRequest } from '@/lib/types';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { UserPlus, X, Check } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function FriendRequestPopup() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<FriendRequest | null>(null);
  const [loading, setLoading] = useState(false);

  // Do not show on auth pages or if already on friends requests tab
  const isAuthPage = pathname === '/login' || pathname.startsWith('/reset-password');
  const isFriendsPage = pathname === '/friends';

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends?userId=${user.id}`);
      const data = await res.json();
      if (data.success && data.data.pendingRequests) {
        setRequests(data.data.pendingRequests);
      }
    } catch (err) {
      console.error('Failed to fetch friend requests:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user || isAuthPage) return;

    // Initial fetch
    fetchRequests();

    // Subscribe to new incoming friend requests!
    const channel = supabaseBrowser
      .channel(`friend_requests_popup:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new;
          if (row.status === 'pending') {
            const newReq: FriendRequest = {
              id: row.id,
              fromUserId: row.from_user_id,
              fromUserName: row.from_user_name,
              toUserId: row.to_user_id,
              toUserName: row.to_user_name,
              status: row.status,
              createdAt: row.created_at,
            };
            setRequests(prev => {
              if (prev.some(r => r.id === newReq.id)) return prev;
              return [newReq, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [user, isAuthPage, fetchRequests]);

  // Set active request to show (the oldest one first, or newest?)
  // Let's show the newest one first.
  useEffect(() => {
    if (requests.length > 0 && !activeRequest) {
      setActiveRequest(requests[0]);
    } else if (requests.length === 0) {
      setActiveRequest(null);
    }
  }, [requests, activeRequest]);

  const handleRespond = async (status: 'accepted' | 'declined') => {
    if (!activeRequest) return;
    setLoading(true);
    try {
      await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: activeRequest.id, status }),
      });
      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== activeRequest.id));
      setActiveRequest(null);
    } catch (err) {
      console.error('Failed to respond to request:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (!activeRequest) return;
    // Just locally dismiss this one so they can see it later on Friends page
    setRequests(prev => prev.filter(r => r.id !== activeRequest.id));
    setActiveRequest(null);
  };

  if (isAuthPage || isFriendsPage || !activeRequest) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] left-4 right-4 md:left-auto md:right-6 md:bottom-20 md:w-80 z-[100] animate-in slide-in-from-bottom-8 fade-in-0 duration-300">
      <div 
        className="rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl" 
        style={{ 
          background: 'var(--surface-solid)', 
          border: '1px solid var(--glass-border)',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px rgba(124, 58, 237, 0.15)' 
        }}
      >
        <div className="p-4 relative">
          <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-[var(--muted)] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex flex-col items-center justify-center shrink-0 border border-white/10 shadow-lg">
              <UserPlus size={20} className="text-white mb-0.5" />
            </div>
            <div className="flex-1 pr-6">
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1">New Request</p>
              <h3 className="text-[15px] font-bold text-white leading-tight">
                {activeRequest.fromUserName}
              </h3>
              <p className="text-xs text-white/60 mt-0.5">Wants to be your friend</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleRespond('declined')}
              disabled={loading}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={() => handleRespond('accepted')}
              disabled={loading}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check size={14} />
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
