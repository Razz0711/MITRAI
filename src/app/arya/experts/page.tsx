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
  const brandHeroGradient = 'linear-gradient(135deg, rgba(124,58,237,0.96) 0%, rgba(236,72,153,0.88) 55%, rgba(109,40,217,0.96) 100%)';
  const brandActionGradient = 'linear-gradient(135deg, var(--primary), #6d28d9)';

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
      } else {
        console.error('API Error:', data.error);
        alert('Supabase DB Error: ' + data.error);
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

  return (
    <div className="min-h-screen pb-32 page-enter" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: brandHeroGradient }}>
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
                background: filter === f.key ? brandActionGradient : 'var(--surface)',
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
            <Loader2 size={24} className="text-[var(--primary-light)] animate-spin" />
          </div>
        )}

        {/* Expert Cards */}
        {!loading && (
          <div className="space-y-4">
            {filtered.map((expert, idx) => (
              <div
                key={expert.id}
                onClick={() => router.push(`/arya/experts/${expert.id}`)}
                className="w-full rounded-[24px] p-5 text-left transition-all active:scale-[0.98] cursor-pointer"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}
              >
                <div className="flex gap-4">
                  {/* TalkToAngel Styled Avatar Box */}
                  <div
                    className="w-[84px] h-[84px] rounded-[20px] flex-shrink-0 relative overflow-hidden flex flex-col items-center justify-center border-2 border-pink-500/20"
                    style={{
                      background: expert.avatar_url?.startsWith('#') 
                        ? `linear-gradient(135deg, ${expert.avatar_url}40, ${expert.avatar_url}10)`
                        : 'linear-gradient(180deg, rgba(236,72,153,0.1) 0%, rgba(236,72,153,0.05) 100%)',
                    }}
                  >
                    <span className="absolute top-1.5 text-[6px] font-black tracking-wider text-pink-400/80">MITRRAI+</span>
                    {expert.avatar_url && !expert.avatar_url.startsWith('#') ? (
                      <img src={expert.avatar_url} alt={expert.name} className="w-full h-full object-cover mt-2" />
                    ) : (
                      <span className="text-xl font-bold text-white mt-1">{getInitials(expert.name)}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-bold text-[var(--foreground)] truncate leading-tight">{expert.name}</h3>
                    <p className="text-[12px] font-semibold text-pink-400 mt-0.5 mb-1.5 truncate">{expert.title}</p>
                    <p className="text-[13px] font-bold text-[var(--foreground)]">{expert.experience_years} Years of Exp</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] opacity-80">🎓</span>
                      <span className="text-[11px] text-[var(--muted)] truncate">{(expert.qualifications || []).slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Ratings & Booking */}
                <div className="flex items-end justify-between mt-5">
                  <div className="flex flex-col gap-2">
                    {/* Stars Row precisely like screenshot */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-black text-[var(--foreground)]">{expert.rating?.toFixed(1) || 'NEW'}</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={12} 
                            className="text-pink-500" 
                            fill={i < Math.round(expert.rating || 0) ? '#ec4899' : 'transparent'} 
                            strokeWidth={i < Math.round(expert.rating || 0) ? 0 : 1.5} 
                          />
                        ))}
                      </div>
                      <span className="text-[12px] font-bold text-[var(--foreground)]">({expert.review_count})</span>
                    </div>
                    {/* Timings */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] text-pink-400">📅</span>
                      <span className="text-[11px] font-medium text-pink-400">Availability Timings</span>
                    </div>
                  </div>
                  
                  {/* Blue Pill Book Session Button like screenshot */}
                  <button
                    className="text-white font-bold text-[12px] px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                    style={{ background: brandActionGradient }}
                  >
                    Book Session
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--muted)] text-sm">No experts found matching your search</p>
          </div>
        )}

        {/* Trust Badge */}
        <div className="rounded-2xl p-4 flex items-center gap-3 mt-2" style={{ background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.18)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: 'rgba(124,58,237,0.14)' }}>
            <Shield size={18} className="text-[var(--accent-light)]" />
          </div>
          <p className="text-[11px] text-[var(--muted)] leading-relaxed flex-1">
            <strong className="text-[var(--accent-light)] font-semibold">All experts are verified.</strong> Licensed professionals with verified credentials and experience.
          </p>
        </div>
      </div>
    </div>
  );
}
