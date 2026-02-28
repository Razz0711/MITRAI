// ============================================
// MitrAI - Session History & Analytics Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Analytics {
  totalSessions: number;
  completedSessions: number;
  totalSessionHours: number;
  totalMessages: number;
  materialsUploaded: number;
  friendCount: number;
  overallAttendance: number;
  studyStreak: number;
  messagesByDay: Record<string, number>;
  subjectsStudied: string[];
}

interface SessionRecord {
  id: string;
  topic: string;
  goal: string;
  status: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }

    async function loadAnalytics() {
      try {
        const res = await fetch(`/api/analytics?userId=${user!.id}`);
        const data = await res.json();
        if (data.success) {
          setAnalytics(data.data.analytics);
          setSessions(data.data.sessions || []);
        }
      } catch (err) {
        console.error('loadAnalytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [user, router]);

  if (!user) return null;
  if (loading) return <div className="max-w-4xl mx-auto px-4 py-6"><LoadingSkeleton type="cards" count={4} /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-[var(--foreground)]">Session History & Analytics</h1>

      {/* Stats Grid */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Study Streak', value: `${analytics.studyStreak} days`, icon: '🔥' },
            { label: 'Sessions', value: analytics.totalSessions, icon: '📖' },
            { label: 'Study Hours', value: `${analytics.totalSessionHours}h`, icon: '⏱️' },
            { label: 'Messages', value: analytics.totalMessages, icon: '💬' },
            { label: 'Friends', value: analytics.friendCount, icon: '👥' },
            { label: 'Materials', value: analytics.materialsUploaded, icon: '📚' },
            { label: 'Attendance', value: `${analytics.overallAttendance}%`, icon: '📊' },
            { label: 'Subjects', value: analytics.subjectsStudied.length, icon: '📝' },
          ].map(s => (
            <div key={s.label} className="card p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] text-[var(--muted)]">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-[var(--foreground)]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Activity Heatmap (last 30 days) */}
      {analytics && Object.keys(analytics.messagesByDay).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Message Activity (Last 30 Days)</h2>
          <div className="card p-4">
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                const key = d.toISOString().split('T')[0];
                const count = analytics.messagesByDay[key] || 0;
                const intensity = count === 0 ? 'bg-[var(--surface-light)]'
                  : count < 5 ? 'bg-green-900/40'
                  : count < 15 ? 'bg-green-700/60'
                  : count < 30 ? 'bg-green-500/70'
                  : 'bg-green-400';
                return (
                  <div
                    key={key}
                    className={`w-6 h-6 rounded-sm ${intensity} transition-colors`}
                    title={`${key}: ${count} messages`}
                  />
                );
              })}
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-2">Less → More messages</p>
          </div>
        </section>
      )}

      {/* Subjects Studied */}
      {analytics && analytics.subjectsStudied.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Subjects Studied</h2>
          <div className="flex flex-wrap gap-2">
            {analytics.subjectsStudied.map(s => (
              <span key={s} className="px-3 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary-light)] text-xs">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Session History */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Recent Sessions</h2>
        {sessions.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-[var(--muted)]">No study sessions yet. Start a session with a buddy!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <div key={session.id} className="card p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--foreground)]">{session.topic || 'Study Session'}</p>
                  {session.goal && <p className="text-[10px] text-[var(--muted)]">{session.goal}</p>}
                  <p className="text-[10px] text-[var(--muted)]">
                    {new Date(session.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  session.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                  session.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
