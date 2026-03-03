// ============================================
// MitrAI - Skill Swap
// "I'll teach you X if you teach me Y"
// Peer-to-peer free skill exchange marketplace
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import SubTabBar from '@/components/SubTabBar';

const SKILL_CATEGORIES = [
  { id: 'coding', emoji: '💻', label: 'Coding', skills: ['Python', 'JavaScript', 'C++', 'Java', 'DSA', 'Web Dev', 'App Dev', 'ML/AI'] },
  { id: 'music', emoji: '🎸', label: 'Music', skills: ['Guitar', 'Piano', 'Singing', 'Drums', 'Tabla', 'Flute', 'Music Production'] },
  { id: 'sports', emoji: '🏏', label: 'Sports', skills: ['Cricket', 'Football', 'Basketball', 'Badminton', 'Chess', 'Table Tennis', 'Swimming'] },
  { id: 'arts', emoji: '🎨', label: 'Arts', skills: ['Drawing', 'Painting', 'Digital Art', 'Photography', 'Video Editing', 'Graphic Design'] },
  { id: 'academic', emoji: '📚', label: 'Academic', skills: ['Math', 'Physics', 'Chemistry', 'English', 'Communication', 'Aptitude'] },
  { id: 'language', emoji: '🗣️', label: 'Languages', skills: ['Hindi', 'English', 'Japanese', 'German', 'French', 'Spanish'] },
  { id: 'fitness', emoji: '🏋️', label: 'Fitness', skills: ['Gym Training', 'Yoga', 'Running', 'Calisthenics', 'Diet Planning'] },
  { id: 'other', emoji: '✨', label: 'Other', skills: ['Cooking', 'Public Speaking', 'Debate', 'Content Writing', 'Trading/Finance'] },
];

const ALL_SKILLS = SKILL_CATEGORIES.flatMap(c => c.skills);

interface SkillOffer {
  id: string;
  userId: string;
  userName: string;
  canTeach: string[];
  wantToLearn: string[];
  description: string;
  isActive: boolean;
  createdAt: string;
}

export default function SkillSwapPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<SkillOffer[]>([]);
  const [myOffer, setMyOffer] = useState<SkillOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterSkill, setFilterSkill] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create form
  const [canTeach, setCanTeach] = useState<string[]>([]);
  const [wantToLearn, setWantToLearn] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/skills?userId=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setOffers(data.data.offers || []);
        setMyOffer(data.data.myOffer || null);
      }
    } catch (err) {
      console.error('loadOffers:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const handleSubmit = async () => {
    if (!user || canTeach.length === 0 || wantToLearn.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name || user.email?.split('@')[0] || 'Student',
          canTeach,
          wantToLearn,
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setCanTeach([]);
        setWantToLearn([]);
        setDescription('');
        await loadOffers();
      }
    } catch (err) {
      console.error('submitOffer:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!user) return;
    try {
      await fetch('/api/skills', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      setMyOffer(null);
      await loadOffers();
    } catch (err) {
      console.error('deactivate:', err);
    }
  };

  const toggleSkill = (skill: string, list: string[], setList: (s: string[]) => void) => {
    if (list.includes(skill)) {
      setList(list.filter(s => s !== skill));
    } else if (list.length < 5) {
      setList([...list, skill]);
    }
  };

  const getMatchScore = (offer: SkillOffer) => {
    if (!myOffer) return 0;
    const theyTeachILearn = offer.canTeach.filter(s => myOffer.wantToLearn.includes(s)).length;
    const iTeachTheyLearn = myOffer.canTeach.filter(s => offer.wantToLearn.includes(s)).length;
    return theyTeachILearn + iTeachTheyLearn;
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'just now';
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // Sort: matches first, then recent
  const sortedOffers = [...offers]
    .filter(o => o.userId !== user?.id)
    .filter(o => {
      if (!filterSkill) return true;
      return o.canTeach.includes(filterSkill) || o.wantToLearn.includes(filterSkill);
    })
    .filter(o => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return o.userName.toLowerCase().includes(q) || o.canTeach.some(s => s.toLowerCase().includes(q)) || o.wantToLearn.some(s => s.toLowerCase().includes(q));
    })
    .sort((a, b) => getMatchScore(b) - getMatchScore(a));

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <LoadingSkeleton type="cards" count={4} label="Loading skill offers..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">
      <SubTabBar group="radar" />
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold mb-1">
          <span className="gradient-text">Skill Swap</span> 🔄
        </h1>
        <p className="text-xs text-[var(--muted)]">
          Teach what you know, learn what you want • {offers.length} offers
        </p>
      </div>

      {/* My Offer Status */}
      {myOffer ? (
        <div className="card p-4 border-[var(--success)]/30">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-semibold">🔄 Your Offer is Live</p>
            <button
              onClick={handleDeactivate}
              className="text-[10px] text-[var(--error)] hover:bg-[var(--error)]/10 px-2 py-1 rounded-lg"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-[var(--muted)] mb-1">I can teach:</p>
              <div className="flex flex-wrap gap-1">
                {myOffer.canTeach.map(s => (
                  <span key={s} className="badge-success text-[10px]">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-[var(--muted)] mb-1">I want to learn:</p>
              <div className="flex flex-wrap gap-1">
                {myOffer.wantToLearn.map(s => (
                  <span key={s} className="badge-primary text-[10px]">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : !showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full card p-5 text-center hover:border-[var(--primary)]/40 transition-all group"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--primary)]/15 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
            🔄
          </div>
          <p className="text-sm font-semibold">Create Your Skill Offer</p>
          <p className="text-xs text-[var(--muted)] mt-1">Tell people what you can teach and what you want to learn</p>
        </button>
      ) : (
        /* Create Form */
        <div className="card p-5 border-[var(--primary)]/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">🔄 Create Skill Offer</span>
            <button onClick={() => setShowCreate(false)} className="text-xs text-[var(--muted)]">✕</button>
          </div>

          {/* Can Teach */}
          <div>
            <label className="label">I can teach (pick up to 5):</label>
            <div className="space-y-2">
              {SKILL_CATEGORIES.map(cat => (
                <div key={cat.id}>
                  <p className="text-[10px] text-[var(--muted)] mb-1">{cat.emoji} {cat.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.skills.map(skill => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill, canTeach, setCanTeach)}
                        disabled={wantToLearn.includes(skill)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                          canTeach.includes(skill)
                            ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30'
                            : wantToLearn.includes(skill)
                            ? 'bg-[var(--surface)] text-[var(--muted)]/30 cursor-not-allowed opacity-30'
                            : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--success)]/50'
                        }`}
                      >
                        {canTeach.includes(skill) ? '✓ ' : ''}{skill}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {canTeach.length > 0 && (
              <p className="text-[10px] text-[var(--success)] mt-2">Teaching: {canTeach.join(', ')}</p>
            )}
          </div>

          {/* Want to Learn */}
          <div>
            <label className="label">I want to learn (pick up to 5):</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SKILLS.filter(s => !canTeach.includes(s)).map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill, wantToLearn, setWantToLearn)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                    wantToLearn.includes(skill)
                      ? 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30'
                      : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:border-[var(--primary)]/50'
                  }`}
                >
                  {wantToLearn.includes(skill) ? '✓ ' : ''}{skill}
                </button>
              ))}
            </div>
            {wantToLearn.length > 0 && (
              <p className="text-[10px] text-[var(--primary-light)] mt-2">Learning: {wantToLearn.join(', ')}</p>
            )}
          </div>

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Anything else? (e.g., 'Available weekends, beginner-friendly')"
            rows={2}
            className="input-field text-xs resize-none"
            maxLength={200}
          />

          <button
            onClick={handleSubmit}
            disabled={canTeach.length === 0 || wantToLearn.length === 0 || submitting}
            className="btn-primary w-full text-xs"
          >
            {submitting ? 'Publishing...' : '🔄 Publish My Offer'}
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="space-y-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-xs">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search skills or people..."
            className="input-field pl-8 text-xs py-2.5"
          />
        </div>
        {/* Popular skill filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['Python', 'Guitar', 'DSA', 'Cricket', 'Math', 'Drawing'].map(s => (
            <button
              key={s}
              onClick={() => setFilterSkill(filterSkill === s ? '' : s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                filterSkill === s
                  ? 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30'
                  : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Offers Feed */}
      {sortedOffers.length === 0 ? (
        <div className="card p-8 text-center">
          <span className="text-4xl mb-3 block">🔄</span>
          <p className="text-sm font-medium mb-1">No skill offers yet</p>
          <p className="text-xs text-[var(--muted)]">Be the first to offer a skill swap!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{sortedOffers.length} Skill Offers</h2>
          {sortedOffers.map(offer => {
            const matchScore = getMatchScore(offer);
            return (
              <div
                key={offer.id}
                className={`card p-4 transition-all hover:border-[var(--primary)]/40 ${
                  matchScore > 0 ? 'border-[var(--success)]/30' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center text-sm font-bold text-[var(--primary-light)]">
                      {offer.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{offer.userName}</p>
                      <p className="text-[10px] text-[var(--muted)]">{timeAgo(offer.createdAt)}</p>
                    </div>
                  </div>
                  {matchScore > 0 && (
                    <span className="badge-success text-[10px]">🎯 {matchScore} match{matchScore > 1 ? 'es' : ''}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-[var(--success)] font-medium mb-1">Can teach:</p>
                    <div className="flex flex-wrap gap-1">
                      {offer.canTeach.map(s => (
                        <span
                          key={s}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            myOffer?.wantToLearn.includes(s)
                              ? 'bg-[var(--success)]/20 text-[var(--success)] border border-[var(--success)]/30 font-bold'
                              : 'bg-[var(--surface-light)] text-[var(--muted)]'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--primary-light)] font-medium mb-1">Wants to learn:</p>
                    <div className="flex flex-wrap gap-1">
                      {offer.wantToLearn.map(s => (
                        <span
                          key={s}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            myOffer?.canTeach.includes(s)
                              ? 'bg-[var(--primary)]/20 text-[var(--primary-light)] border border-[var(--primary)]/30 font-bold'
                              : 'bg-[var(--surface-light)] text-[var(--muted)]'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {offer.description && (
                  <p className="text-xs text-[var(--muted)] mb-3">&ldquo;{offer.description}&rdquo;</p>
                )}

                <Link
                  href={`/chat?friendId=${encodeURIComponent(offer.userId)}&friendName=${encodeURIComponent(offer.userName)}`}
                  className="w-full block text-center py-2 rounded-lg text-xs font-medium bg-[var(--primary)]/15 text-[var(--primary-light)] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/25 transition-all"
                >
                  💬 Propose Swap
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
