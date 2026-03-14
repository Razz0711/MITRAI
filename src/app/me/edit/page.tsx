// ============================================
// MitrAI - Edit Profile Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { StudentProfile } from '@/lib/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { ArrowLeft, Edit2, Lock, ChevronDown, X } from 'lucide-react';

const SCHEDULE_OPTIONS = [
  { id: 'Morning', icon: '🌅', label: 'Morning' },
  { id: 'Afternoon', icon: '🌻', label: 'Afternoon' },
  { id: 'Evening', icon: '🌇', label: 'Evening' },
  { id: 'Night', icon: '🌙', label: 'Night' },
  { id: 'Late Night', icon: '🦉', label: 'Late Night' },
  { id: 'Weekends', icon: '📅', label: 'Weekends' },
];

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState(false); // For photo zoom

  // Form state
  const [bio, setBio] = useState('');
  const [schedule, setSchedule] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setProfile(data.data as StudentProfile);
        setBio(data.data.bio || '');
        setSchedule(data.data.schedulePreferences || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          bio,
          schedulePreferences: schedule,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/me');
      } else {
        alert(data.error || 'Failed to save changes');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSchedule = (id: string) => {
    setSchedule((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={3} label="Loading profile editors..." />
      </div>
    );
  }

  const initial = (profile?.name || user?.name || 'S').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--background)] max-w-2xl mx-auto flex flex-col pt-3 overflow-x-hidden">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[var(--foreground)] hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Edit Profile</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-xl text-sm font-bold text-white shadow-lg disabled:opacity-50 transition-all hover:brightness-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4">
        {/* ── Avatar Section ── */}
        <div className="card p-6 flex flex-col items-center text-center">
          <div className="relative mb-4 group cursor-pointer" onClick={() => setZoomPhoto(true)}>
            <div className="w-24 h-24 rounded-full bg-indigo-900/40 border-2 border-indigo-500/20 flex items-center justify-center text-white font-bold text-4xl shadow-xl transition-transform active:scale-95">
              {initial}
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white border-2 border-[var(--surface)] shadow-md group-hover:bg-indigo-400 transition-colors">
              <Edit2 size={14} />
            </div>
          </div>
          <p className="text-sm font-semibold text-[var(--muted)] mb-4">
            Tap to change · Shown to your matches
          </p>
          <button className="px-5 py-2 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/20 transition-all">
            Upload Photo
          </button>
        </div>

        {/* ── Photo Zoom Modal ── */}
        {zoomPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200" onClick={() => setZoomPhoto(false)}>
            <button 
              className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setZoomPhoto(false); }}
            >
              <X size={24} />
            </button>
            <div 
              className="w-64 h-64 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-indigo-600 to-purple-800 border-4 border-white/20 flex items-center justify-center text-white font-bold text-6xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {initial}
            </div>
          </div>
        )}

        {/* ── BIO Section ── */}
        <div className="card p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
            BIO
          </h3>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 100))}
              placeholder="Tell your study buddies something about you — your subjects, goals, vibe..."
              className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none focus:outline-none min-h-[80px]"
            />
            <div className="absolute bottom-0 right-0 text-[10px] font-semibold text-[var(--muted)]">
              {bio.length} / 100
            </div>
          </div>
        </div>

        {/* ── WHEN DO YOU STUDY? Section ── */}
        <div className="card p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
            WHEN DO YOU STUDY?
          </h3>
          <p className="text-[11px] text-[var(--muted)] mb-4 font-medium">
            Used to find the best matching study buddy for your schedule
          </p>
          
          <div className="grid grid-cols-3 gap-3">
            {SCHEDULE_OPTIONS.map((opt) => {
              const isSelected = schedule.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleSchedule(opt.id)}
                  className={`relative overflow-hidden p-4 rounded-xl flex flex-col items-center justify-center gap-2 border transition-all ${
                    isSelected 
                      ? 'bg-indigo-950/30 border-indigo-500' 
                      : 'bg-[#18181b] border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Subtle active glow inside card */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none" />
                  )}
                  <span className="text-xl relative z-10">{opt.icon}</span>
                  <span className={`text-[11px] font-bold relative z-10 ${isSelected ? 'text-indigo-200' : 'text-[var(--foreground)]'}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Locked Info Section ── */}
        <div className="card p-4 flex items-center gap-3 bg-black/40 border border-amber-500/10">
          <Lock size={16} className="text-amber-500/60 shrink-0" />
          <p className="text-[11px] text-[var(--muted)] leading-relaxed flex-1">
            <strong className="text-amber-500/60 font-semibold">Branch, Year & Email</strong> are auto-filled from your SVNIT registration and cannot be changed.
          </p>
        </div>

      </div>

      {/* ── Scroll Indicator Overlay ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none fade-in">
        <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-black/10">
          <ChevronDown size={20} className="animate-bounce/2" />
        </div>
      </div>
    </div>
  );
}
