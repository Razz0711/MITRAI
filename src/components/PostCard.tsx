'use client';

import { Sparkles, MoreHorizontal, Trash2, Flag } from 'lucide-react';
import Avatar from './Avatar';

interface PostCardProps {
  post: any;
  userLat: number | null;
  userLng: number | null;
  userId: string;
  onReact: (postId: string, type: string) => void;
  menuPostId: string | null;
  setMenuPostId: (id: string | null) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  onDelete: (id: string) => void;
  isSos?: boolean;
  isOlder?: boolean;
  categories: any[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getFreshness(dateStr: string): 'fresh' | 'active' | 'older' {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 15 * 60 * 1000) return 'fresh';
  if (diff < 2 * 60 * 60 * 1000) return 'active';
  return 'older';
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `~${Math.round(meters)}m`;
  return `~${(meters / 1000).toFixed(1)}km`;
}

export default function PostCard({
  post, userLat, userLng, userId, onReact, menuPostId, setMenuPostId, deleteConfirm, setDeleteConfirm, onDelete, isSos, isOlder, categories
}: PostCardProps) {
  const freshness = getFreshness(post.createdAt);
  const isOwn = post.userId === userId;
  const distance = (userLat && userLng && post.lat && post.lng) ? haversineDistance(userLat, userLng, post.lat, post.lng) : null;
  const catInfo = categories.find(c => c.id === post.category);

  return (
    <div
      className={`card p-3.5 space-y-2.5 transition-all ${isSos ? 'border-red-500/40 shadow-lg shadow-red-500/10' : freshness === 'fresh' ? 'border-green-500/20' : ''} ${isOlder ? 'opacity-65' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        {post.isAnonymous ? (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
            <Sparkles size={14} className="text-purple-400" />
          </div>
        ) : (
          <Avatar src={post.userPhotoUrl} name={post.userName || 'U'} size={32} />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-[var(--foreground)] truncate block">{post.userName || 'Anonymous'}</span>
          <div className="flex items-center gap-1.5 text-[9px] text-[var(--muted)]">
            {distance !== null && <span className="text-amber-400 font-medium">{formatDistance(distance)}</span>}
            <span>{timeAgo(post.createdAt)}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${isSos ? 'bg-red-500/20 text-red-400' : freshness === 'fresh' ? 'bg-green-500/20 text-green-400' : freshness === 'active' ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--surface)] text-[var(--muted)]'}`}>
              {isSos ? 'SOS' : freshness}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMenuPostId(menuPostId === post.id ? null : post.id)}
          className="p-1.5 shrink-0 rounded-lg hover:bg-[var(--surface)] text-[var(--muted)] transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Menu dropdown */}
      {menuPostId === post.id && (
        <div className="flex gap-2 px-2">
          {isOwn && (
            <button onClick={() => { setDeleteConfirm(post.id); setMenuPostId(null); }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-medium">
              <Trash2 size={10} /> Delete
            </button>
          )}
          {!isOwn && (
            <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--surface)] text-[var(--muted)] text-[10px] font-medium">
              <Flag size={10} /> Report
            </button>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {catInfo && (
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${isSos ? 'bg-red-500/20 text-red-400' : 'bg-[var(--primary)]/10 text-[var(--primary-light)]'}`}>
            {catInfo.emoji} {catInfo.label}
          </span>
        )}
        {post.subcategory && (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]">
            {post.subcategory}
          </span>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-[var(--foreground)] leading-relaxed">{post.content}</p>

      {/* Engagement */}
      {post.reactions && (post.reactions.imin > 0 || post.reactions.connect > 0) && (
        <p className="text-[9px] text-[var(--muted)]">
          {post.reactions.imin > 0 && `${post.reactions.imin} joined`}
          {post.reactions.imin > 0 && post.reactions.connect > 0 && ' · '}
          {post.reactions.connect > 0 && `${post.reactions.connect} connected`}
        </p>
      )}

      {/* Global Standardized Buttons: User complained some were colored and some outline. 
          We'll make them all lightly tinted (surface-light) matching the modern UI, 
          and nicely colored only when active. This removes the 'random colors' look. */}
      <div className="flex gap-2">
        {(['imin', 'reply', 'connect'] as const).map(type => {
          const active = post.myReactions?.includes(type);
          const label = type === 'imin' ? "I'm in!" : type === 'reply' ? 'Reply' : 'Connect';
          
          return (
            <button
              key={type}
              onClick={() => onReact(post.id, type)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-semibold transition-all ${
                active
                ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20 border border-[var(--primary)]'
                : 'bg-[var(--surface-light)] text-[var(--foreground)] border border-[var(--glass-border)] hover:bg-[var(--surface)]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
