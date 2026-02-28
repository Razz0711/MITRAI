// ============================================
// MitrAI - Admin Dashboard Page
// Protected by ADMIN_KEY — shows stats, pending subscriptions, reports
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AdminStats {
  totalUsers: number;
  totalMaterials: number;
  pendingSubscriptions: number;
  pendingReports: number;
}

interface PendingSub {
  user_id: string;
  plan: string;
  transaction_id: string;
  status: string;
  created_at: string;
}

interface PendingReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  department: string;
  year_level: string;
  created_at: string;
}

interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  type: string;
  rating: number;
  message: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [pendingSubs, setPendingSubs] = useState<PendingSub[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const loadDashboard = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin?adminKey=${encodeURIComponent(adminKey)}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to authenticate');
        setAuthenticated(false);
        return;
      }
      setAuthenticated(true);
      setStats(data.data.stats);
      setRecentUsers(data.data.recentUsers || []);
      setPendingSubs(data.data.pendingSubscriptions || []);
      setPendingReports(data.data.pendingReports || []);
      setRecentFeedback(data.data.recentFeedback || []);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  const handleAdminAction = async (action: string, targetId: string, extra?: Record<string, string>) => {
    setActionMsg('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey, action, targetId, ...extra }),
      });
      const data = await res.json();
      setActionMsg(data.message || data.error || 'Done');
      // Refresh data
      loadDashboard();
    } catch {
      setActionMsg('Action failed');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-[var(--foreground)]">Admin Dashboard</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Enter your admin key to access</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); loadDashboard(); }} className="space-y-3">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin Key"
              className="input-field text-sm"
              autoFocus
            />
            {error && <p className="text-xs text-[var(--error)]">{error}</p>}
            <button type="submit" className="btn-primary w-full text-sm py-2.5" disabled={loading}>
              {loading ? 'Verifying...' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Admin Dashboard</h1>
        <button onClick={() => setAuthenticated(false)} className="text-xs text-[var(--muted)] hover:text-[var(--error)]">
          Lock
        </button>
      </div>

      {actionMsg && (
        <div className="text-xs text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg px-3 py-2">
          {actionMsg}
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
            { label: 'Materials', value: stats.totalMaterials, icon: '📚' },
            { label: 'Pending Subs', value: stats.pendingSubscriptions, icon: '💳' },
            { label: 'Pending Reports', value: stats.pendingReports, icon: '🚩' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>{s.icon}</span>
                <span className="text-xs text-[var(--muted)]">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending Subscriptions */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Pending Subscriptions ({pendingSubs.length})</h2>
        {pendingSubs.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No pending subscriptions</p>
        ) : (
          <div className="space-y-2">
            {pendingSubs.map(sub => (
              <div key={sub.user_id} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--foreground)]">{sub.user_id}</p>
                  <p className="text-[10px] text-[var(--muted)]">Plan: {sub.plan} | TxnID: {sub.transaction_id}</p>
                  <p className="text-[10px] text-[var(--muted)]">{new Date(sub.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAdminAction('approve-subscription', sub.user_id)} className="text-xs px-3 py-1 rounded bg-[var(--success)]/20 text-[var(--success)] hover:bg-[var(--success)]/30">
                    Approve
                  </button>
                  <button onClick={() => handleAdminAction('reject-subscription', sub.user_id)} className="text-xs px-3 py-1 rounded bg-[var(--error)]/20 text-[var(--error)] hover:bg-[var(--error)]/30">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Reports */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">User Reports ({pendingReports.length})</h2>
        {pendingReports.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No pending reports</p>
        ) : (
          <div className="space-y-2">
            {pendingReports.map(report => (
              <div key={report.id} className="card p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-[var(--foreground)]">Report: {report.reason}</p>
                    <p className="text-[10px] text-[var(--muted)]">Reporter: {report.reporter_id}</p>
                    <p className="text-[10px] text-[var(--muted)]">Reported: {report.reported_user_id}</p>
                    {report.details && <p className="text-[10px] text-[var(--muted)] mt-1">{report.details}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAdminAction('resolve-report', report.id)} className="text-xs px-3 py-1 rounded bg-[var(--success)]/20 text-[var(--success)]">
                      Resolve
                    </button>
                    <button onClick={() => handleAdminAction('dismiss-report', report.id)} className="text-xs px-3 py-1 rounded bg-[var(--muted)]/20 text-[var(--muted)]">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Feedback */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Recent Feedback</h2>
        <div className="space-y-2">
          {recentFeedback.map(fb => (
            <div key={fb.id} className="card p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-[var(--foreground)]">{fb.name}</span>
                <span className="text-[10px] text-[var(--muted)]">{fb.type}</span>
                <span className="text-[10px] text-amber-400">{'★'.repeat(fb.rating)}</span>
              </div>
              <p className="text-xs text-[var(--muted)]">{fb.message}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Users */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Recent Users (last 50)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Department</th>
                <th className="pb-2 pr-4">Year</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map(u => (
                <tr key={u.id} className="border-b border-[var(--border)]/50">
                  <td className="py-2 pr-4 text-[var(--foreground)]">{u.name}</td>
                  <td className="py-2 pr-4 text-[var(--muted)]">{u.email}</td>
                  <td className="py-2 pr-4 text-[var(--muted)]">{u.department}</td>
                  <td className="py-2 pr-4 text-[var(--muted)]">{u.year_level}</td>
                  <td className="py-2 text-[var(--muted)]">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
