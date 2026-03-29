// ============================================
// MitrRAI - Notifications Page
// Shows all notifications: matches, invites, nearby posts
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Users, MessageCircle, MapPin, AlertTriangle, UserPlus, Check, X } from 'lucide-react';
import { FriendRequest } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { EmptyStatePreset } from '@/components/EmptyState';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    // Fetch from API if available, otherwise show empty state
    const fetchNotifications = async () => {
      try {
        const [res, friendsRes] = await Promise.all([
          fetch(`/api/notifications?userId=${encodeURIComponent(user.id)}`),
          fetch(`/api/friends?userId=${encodeURIComponent(user.id)}`)
        ]);
        const d = await res.json();
        if (d.success && d.data) {
          setNotifications(d.data.filter((n: Notification) => !(n.type === 'session_request' && n.title === 'New Friend Request')));
        }
        const fd = await friendsRes.json();
        if (fd.success && fd.data.pendingRequests) {
          setPendingRequests(fd.data.pendingRequests);
        }
      } catch {
        // API may not exist yet — show empty state
      }
      setLoading(false);
    };
    fetchNotifications();
  }, [user]);

  const handleRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      });
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Failed to respond to request:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'match': return <Users size={16} className="text-green-400" />;
      case 'message': return <MessageCircle size={16} className="text-blue-400" />;
      case 'nearby': return <MapPin size={16} className="text-amber-400" />;
      case 'sos': return <AlertTriangle size={16} className="text-red-400" />;
      default: return <Bell size={16} className="text-[var(--primary)]" />;
    }
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 py-3" style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--surface-light)] text-[var(--muted)] transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-bold text-[var(--foreground)] flex-1">Notifications</h1>
          {notifications.length > 0 && (
            <button
              onClick={() => setNotifications([])}
              className="text-xs text-[var(--primary-light)] hover:text-[var(--foreground)] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {loading && <LoadingSkeleton />}

        {!loading && notifications.length === 0 && pendingRequests.length === 0 && (
          <EmptyStatePreset type="notifications" />
        )}

        {/* Actionable Friend Requests First */}
        {pendingRequests.map(req => (
          <div
            key={req.id}
            className={`card p-4 flex items-center justify-between transition-all`}
            style={{ border: '1px solid rgba(124, 58, 237, 0.3)', background: 'rgba(124, 58, 237, 0.05)' }}
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex flex-col items-center justify-center text-white font-bold shadow-md">
                <UserPlus size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-0.5">Friend Request</p>
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{req.fromUserName}</p>
                <p className="text-[11px] text-[var(--muted-strong)] mt-0.5">{timeAgo(req.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-4">
              <button
                onClick={() => handleRespond(req.id, 'declined')}
                className="p-2 rounded-xl text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                title="Decline"
              >
                <X size={16} />
              </button>
              <button
                onClick={() => handleRespond(req.id, 'accepted')}
                className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-md shadow-violet-500/20 transition-colors"
                title="Accept"
              >
                <Check size={18} />
              </button>
            </div>
          </div>
        ))}

        {/* Standard Notifications */}

        {notifications.map(n => (
          <div
            key={n.id}
            className={`card p-3.5 flex items-start gap-3 transition-all`}
          >
            <div className="shrink-0 w-9 h-9 rounded-xl bg-[var(--surface)] flex items-center justify-center">
              {getIcon(n.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">{n.title}</p>
              <p className={`text-xs mt-0.5 ${n.read ? 'text-[var(--muted-strong)]' : 'text-[var(--muted-strong)]'}`}>{n.message}</p>
              <p className="text-[11px] text-[var(--muted-strong)] mt-1">{timeAgo(n.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
