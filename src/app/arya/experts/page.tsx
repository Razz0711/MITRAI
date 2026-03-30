// ============================================
// MitrRAI - Mental Health Experts Directory
// Browse & search therapists (API-backed)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Star, ChevronRight, Shield, Heart, Loader2 } from 'lucide-react';

interface Expert {
  id: string;
  name: string;
  title: string;
  experience_years: number;
  qualifications: string[];
  languages: string[];
  expertise: string[];
  avatar_url: string | null;
  rating: number;
  review_count: number;
  price_per_session: number;
  is_featured: boolean;
}

export default function ExpertsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'anxiety', label: 'Anxiety' },
    { key: 'depression', label: 'Depression' },
    { key: 'stress', label: 'Stress' },
    { key: 'career', label: 'Career' },
    { key: 'relationships', label: 'Relationships' },
  ];

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    try {
      const res = await fetch('/api/experts');
      const data = await res.json();
      if (data.success) {
        setExperts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch experts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering for instant UX
  const filtered = experts.filter(expert => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      expert.name.toLowerCase().includes(q) ||
      expert.title.toLowerCase().includes(q) ||
      expert.expertise?.some(e => e.toLowerCase().includes(q)) ||
      expert.languages?.some(l => l.toLowerCase().includes(q));

    const matchesFilter = filter === 'all' ||
      expert.expertise?.some(e => e.toLowerCase().includes(filter));

    return matchesSearch && matchesFilter;
  });

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  const AVATAR_COLORS = ['#e879a0', '#6366f1', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#f59e0b'];

  return (
    <div className="min-h-screen pb-32 page-enter" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #5eead4 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-white animate-pulse" />
          <div className="absolute top-24 right-16 w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-8 left-1/4 w-1 h-1 rounded-full bg-white animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="px-4 pt-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button onClick={() => router.push('/arya')} className="w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>
            <Heart size={10} /> Mental Health Community
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 font-heading">Expert Therapists</h1>
          <p className="text-sm text-white/70">Verified professionals ready to help you</p>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Search size={16} className="text-[var(--muted)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search therapists, expertise..."
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all shrink-0"
              style={{
                background: filter === f.key ? 'linear-gradient(135deg, #0f766e, #14b8a6)' : 'var(--surface)',
                color: filter === f.key ? '#fff' : 'var(--muted)',
                border: filter === f.key ? 'none' : '1px solid var(--border)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-teal-400 animate-spin" />
          </div>
        )}

        {/* Expert Cards */}
        {!loading && (
          <div className="space-y-3">
            {filtered.map((expert, idx) => (
              <button
                key={expert.id}
                onClick={() => router.push(`/arya/experts/${expert.id}`)}
                className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-lg font-bold shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}40, ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}20)`,
                      border: `2px solid ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}50`,
                    }}
                  >
                    {getInitials(expert.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-[var(--foreground)] truncate">{expert.name}</h3>
                      {expert.is_featured && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">⭐ TOP</span>}
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: '#14b8a6' }}>{expert.title}</p>
                    <p className="text-[11px] text-[var(--muted)]">{expert.experience_years} Years of Exp</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">🎓 {(expert.qualifications || []).slice(0, 2).join(', ')}</p>
                  </div>

                  <ChevronRight size={16} className="text-[var(--muted)] shrink-0 mt-3" />
                </div>

                {/* Rating + Tags */}
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-1.5">
                    <Star size={12} className="text-amber-400" fill="#fbbf24" />
                    <span className="text-xs font-bold text-white/90">{expert.rating || '—'}</span>
                    <span className="text-[10px] text-[var(--muted)]">({expert.review_count} reviews)</span>
                  </div>
                  <div className="flex gap-1.5">
                    {(expert.expertise || []).slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[9px] font-medium" style={{ background: 'rgba(20,184,166,0.1)', color: '#5eead4', border: '1px solid rgba(20,184,166,0.15)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--muted)] text-sm">No experts found matching your search</p>
          </div>
        )}

        {/* Trust Badge */}
        <div className="rounded-2xl p-4 flex items-center gap-3 mt-2" style={{ background: 'var(--surface)', border: '1px solid rgba(20,184,166,0.15)' }}>
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center text-lg shrink-0">
            <Shield size={18} className="text-teal-400" />
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed flex-1">
            <strong className="text-teal-400 font-semibold">All experts are verified.</strong> Licensed professionals with verified credentials and experience.
          </p>
        </div>
      </div>
    </div>
  );
}
