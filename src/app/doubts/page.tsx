// ============================================
// MitrAI - Anonymous Doubts Page
// Open anonymous Q&A visible to everyone
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Doubt {
  id: string;
  userId: string;
  department: string;
  subject: string;
  question: string;
  isAnonymous: boolean;
  upvotes: number;
  status: string;
  createdAt: string;
}

interface DoubtReply {
  id: string;
  doubtId: string;
  userId: string;
  userName: string;
  reply: string;
  isAnonymous: boolean;
  isAccepted: boolean;
  upvotes: number;
  createdAt: string;
}

export default function DoubtsPage() {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);
  const [expandedDoubt, setExpandedDoubt] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, DoubtReply[]>>({});
  const [replyText, setReplyText] = useState('');
  const [replyAnon, setReplyAnon] = useState(true);

  // Ask form
  const [askQuestion, setAskQuestion] = useState('');
  const [askAnon, setAskAnon] = useState(true);
  const [asking, setAsking] = useState(false);

  const loadDoubts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/doubts');
      const data = await res.json();
      if (data.success) setDoubts(data.data.doubts || []);
    } catch (err) {
      console.error('loadDoubts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDoubts();
  }, [loadDoubts]);

  const handleAsk = async () => {
    if (!user || !askQuestion.trim()) return;
    setAsking(true);
    try {
      const res = await fetch('/api/doubts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          question: askQuestion,
          isAnonymous: askAnon,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAsk(false);
        setAskQuestion('');
        await loadDoubts();
      }
    } catch (err) {
      console.error('askDoubt:', err);
    } finally {
      setAsking(false);
    }
  };

  const handleUpvote = async (doubtId: string) => {
    try {
      await fetch('/api/doubts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upvote', doubtId }),
      });
      await loadDoubts();
    } catch (err) {
      console.error('upvote:', err);
    }
  };

  const loadReplies = async (doubtId: string) => {
    if (expandedDoubt === doubtId) {
      setExpandedDoubt(null);
      return;
    }
    try {
      const res = await fetch(`/api/doubts/${doubtId}/replies`);
      const data = await res.json();
      if (data.success) {
        setReplies((prev) => ({ ...prev, [doubtId]: data.data.replies || [] }));
      }
    } catch (err) {
      console.error('loadReplies:', err);
    }
    setExpandedDoubt(doubtId);
  };

  const handleReply = async (doubtId: string) => {
    if (!user || !replyText.trim()) return;
    try {
      await fetch(`/api/doubts/${doubtId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.email?.split('@')[0] || 'Student',
          reply: replyText,
          isAnonymous: replyAnon,
        }),
      });
      setReplyText('');
      setReplyAnon(false);
      await loadReplies(doubtId);
      // Re-expand after loading
      setExpandedDoubt(doubtId);
    } catch (err) {
      console.error('addReply:', err);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-1">
          <span className="gradient-text">Ask Anything</span> 💭
        </h1>
        <p className="text-xs text-[var(--muted)]">
          Anonymous Q&A for SVNITians — everyone can see, no one knows who asked
        </p>
      </div>

      {/* Ask CTA */}
      {!showAsk ? (
        <button
          onClick={() => setShowAsk(true)}
          className="w-full card p-4 mb-6 text-left hover:border-[var(--primary)]/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--primary)]/15 flex items-center justify-center text-lg">
              🕵️
            </div>
            <span className="text-sm text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
              What&apos;s on your mind? Ask anonymously...
            </span>
          </div>
        </button>
      ) : (
        <div className="card p-5 mb-6 border-[var(--primary)]/30 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🕵️</span>
            <span className="text-sm font-semibold">New Question</span>
          </div>
          <textarea
            value={askQuestion}
            onChange={(e) => setAskQuestion(e.target.value)}
            placeholder="Type your question... (exams, college life, academics, anything)"
            rows={3}
            autoFocus
            className="w-full px-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--surface-light)] text-[var(--foreground)] placeholder:text-[var(--muted)] text-sm resize-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]/50 outline-none transition-all"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={askAnon}
                onChange={(e) => setAskAnon(e.target.checked)}
                className="rounded accent-[var(--primary)]"
              />
              Post anonymously
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAsk(false); setAskQuestion(''); }}
                className="px-4 py-2 text-xs rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-light)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAsk}
                disabled={asking || !askQuestion.trim()}
                className="px-5 py-2 bg-[var(--primary)] text-white text-xs font-medium rounded-lg hover:bg-[#6d28d9] disabled:opacity-40 transition-all"
              >
                {asking ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[var(--muted)]">
          {doubts.length} {doubts.length === 1 ? 'question' : 'questions'}
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          🔓 Visible to all SVNITians
        </span>
      </div>

      {/* Empty state */}
      {doubts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">💬</p>
          <p className="text-sm font-semibold text-[var(--foreground)] mb-1">No questions yet</p>
          <p className="text-xs text-[var(--muted)] mb-4">Be the first to break the ice — ask anything anonymously</p>
          <button
            onClick={() => setShowAsk(true)}
            className="px-5 py-2 bg-[var(--primary)] text-white text-xs font-medium rounded-lg hover:bg-[#6d28d9] transition-all"
          >
            Ask the First Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {doubts.map((doubt) => (
            <div
              key={doubt.id}
              className="card p-4 hover:border-[var(--border-light)] transition-all"
            >
              {/* Question */}
              <p className="text-sm text-[var(--foreground)] leading-relaxed mb-3">{doubt.question}</p>

              {/* Meta + Actions row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                  <span>{doubt.isAnonymous ? '🕵️ Anonymous' : '👤 Named'}</span>
                  <span className="opacity-40">•</span>
                  <span>{timeAgo(doubt.createdAt)}</span>
                  {doubt.status === 'resolved' && (
                    <>
                      <span className="opacity-40">•</span>
                      <span className="text-[var(--success)]">✓ Resolved</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleUpvote(doubt.id)}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--primary-light)] transition-colors"
                  >
                    <span className="text-sm">▲</span> {doubt.upvotes}
                  </button>
                  <button
                    onClick={() => loadReplies(doubt.id)}
                    className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--primary-light)] transition-colors"
                  >
                    💬 {expandedDoubt === doubt.id ? 'Hide' : 'Reply'}
                  </button>
                </div>
              </div>

              {/* Replies */}
              {expandedDoubt === doubt.id && (
                <div className="mt-4 pt-3 border-t border-[var(--border)] space-y-3">
                  {(replies[doubt.id] || []).length === 0 ? (
                    <p className="text-xs text-[var(--muted)] italic">No replies yet — be the first to help!</p>
                  ) : (
                    (replies[doubt.id] || []).map((r) => (
                      <div
                        key={r.id}
                        className={`p-3 rounded-lg text-sm ${
                          r.isAccepted
                            ? 'bg-[var(--success)]/10 border border-[var(--success)]/20'
                            : 'bg-[var(--surface-light)]'
                        }`}
                      >
                        <p className="text-[var(--foreground)] text-xs leading-relaxed">{r.reply}</p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--muted)]">
                          <span>{r.isAnonymous ? '🕵️ Anonymous' : `👤 ${r.userName}`}</span>
                          <span className="opacity-40">•</span>
                          <span>{timeAgo(r.createdAt)}</span>
                          {r.isAccepted && (
                            <span className="text-[var(--success)] font-medium ml-1">✓ Accepted</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Reply Input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply(doubt.id)}
                      placeholder="Write a reply..."
                      className="flex-1 px-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--surface-light)] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
                    />
                    <label className="flex items-center gap-1 text-[10px] text-[var(--muted)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={replyAnon}
                        onChange={(e) => setReplyAnon(e.target.checked)}
                        className="rounded"
                      />
                      Anon
                    </label>
                    <button
                      onClick={() => handleReply(doubt.id)}
                      disabled={!replyText.trim()}
                      className="px-3 py-2 bg-[var(--primary)] text-white text-xs rounded-lg hover:bg-[#6d28d9] disabled:opacity-40 transition-all"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
