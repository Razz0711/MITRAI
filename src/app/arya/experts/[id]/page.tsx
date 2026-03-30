// ============================================
// MitrRAI - Expert Detail Page (API-backed)
// Profile with tabs: About, Expertise, Reviews
// + Availability calendar & Booking flow
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Clock, Globe, Award, Briefcase, GraduationCap, Heart, MessageCircle, Calendar, Loader2, Send, Check, X, Video, Phone, MessageSquare } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Expert = any;
type Review = { id: string; rating: number; text: string; userName: string; createdAt: string };
type Slot = { id: string; dayOfWeek: number; dayName: string; startTime: string; endTime: string; isBooked: boolean };

type Tab = 'about' | 'expertise' | 'reviews';

export default function ExpertDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [expert, setExpert] = useState<Expert>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [bookingError, setBookingError] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [sessionMode, setSessionMode] = useState<'video' | 'audio' | 'chat'>('video');

  const id = params.id as string;

  useEffect(() => {
    fetchExpert();
  }, [id]);

  const fetchExpert = async () => {
    try {
      const res = await fetch(`/api/experts/${id}`);
      const data = await res.json();
      if (data.success) {
        setExpert(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch expert:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/experts/${id}/reviews`);
      const data = await res.json();
      if (data.success) setReviews(data.data || []);
    } catch { /* silent */ }
    finally { setReviewsLoading(false); }
  };

  const fetchAvailability = async (date: string) => {
    try {
      const res = await fetch(`/api/experts/${id}/availability?date=${date}`);
      const data = await res.json();
      if (data.success) setSlots(data.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
  }, [activeTab]);

  const handleBookSession = () => {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
    setShowBooking(true);
    fetchAvailability(tomorrow.toISOString().split('T')[0]);
  };

  const handleDateChange = (date: string) => {
    setBookingDate(date);
    setSelectedSlot(null);
    fetchAvailability(date);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setBookingStatus('loading');
    setBookingError('');

    try {
      const res = await fetch(`/api/experts/${id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: bookingDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          notes: bookingNotes || undefined,
          sessionMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBookingStatus('success');
      } else {
        setBookingError(data.error || 'Booking failed');
        setBookingStatus('error');
      }
    } catch {
      setBookingError('Network error. Try again.');
      setBookingStatus('error');
    }
  };

  const handleSubmitReview = async () => {
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/experts/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, text: reviewText || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setShowReviewForm(false);
        setReviewText('');
        fetchReviews();
        fetchExpert(); // Refresh rating
      }
    } catch { /* silent */ }
    finally { setReviewSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <Loader2 size={24} className="text-teal-400 animate-spin" />
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--background)' }}>
        <p className="text-[var(--muted)] text-sm mb-4">Expert not found</p>
        <button onClick={() => router.push('/arya/experts')} className="text-teal-400 text-sm font-semibold">← Back to Experts</button>
      </div>
    );
  }

  const AVATAR_COLORS = ['#e879a0', '#6366f1', '#ec4899', '#3b82f6', '#8b5cf6'];
  const avatarColor = AVATAR_COLORS[expert.name.length % AVATAR_COLORS.length];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'about', label: 'About' },
    { key: 'expertise', label: 'Expertise' },
    { key: 'reviews', label: `Reviews (${expert.review_count || 0})` },
  ];

  // Get next 7 dates for booking picker
  const getNext7Days = () => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        num: d.getDate(),
        dayOfWeek: d.getDay(),
      });
    }
    return days;
  };

  return (
    <div className="min-h-screen pb-32 page-enter" style={{ background: 'var(--background)' }}>
      {/* ── Header ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 60%, #a78bfa 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-12 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        </div>

        <div className="px-4 pt-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button onClick={() => router.push('/arya/experts')} className="w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30 transition-colors">
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="text-center pb-8 pt-4">
          <div
            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}80)`,
              border: '4px solid rgba(255,255,255,0.2)',
              boxShadow: `0 8px 32px ${avatarColor}40`,
            }}
          >
            {expert.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{expert.name}</h1>
          <p className="text-sm text-white/80">{expert.title}</p>
          <p className="text-xs text-white/60 mt-0.5">{expert.experience_years} Years of Exp</p>

          <button
            onClick={handleBookSession}
            className="mt-4 px-8 py-3 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97]"
            style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <Calendar size={14} className="inline mr-2" />
            Book Session {expert.price_per_session > 0 ? `· ₹${expert.price_per_session}` : '· Free'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 -mt-3 mb-4">
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Star size={14} className="text-amber-400" fill="#fbbf24" />
              <span className="text-lg font-bold text-white">{expert.rating || '—'}</span>
            </div>
            <p className="text-[10px] text-[var(--muted)]">{expert.review_count} reviews</p>
          </div>
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Clock size={14} className="text-teal-400" />
              <span className="text-lg font-bold text-white">{expert.experience_years}</span>
            </div>
            <p className="text-[10px] text-[var(--muted)]">Years Exp</p>
          </div>
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Globe size={14} className="text-blue-400" />
              <span className="text-lg font-bold text-white">{(expert.languages || []).length}</span>
            </div>
            <p className="text-[10px] text-[var(--muted)]">Languages</p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.key ? 'linear-gradient(135deg, #0f766e, #14b8a6)' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 space-y-4">
        {activeTab === 'about' && (
          <>
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3 flex items-center gap-1.5">
                <Heart size={12} className="text-teal-400" /> About Me
              </p>
              <p className="text-sm text-white/80 leading-relaxed">{expert.about}</p>
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3 flex items-center gap-1.5">
                <GraduationCap size={12} className="text-teal-400" /> Qualifications
              </p>
              <div className="space-y-2">
                {(expert.qualifications || []).map((q: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                    <p className="text-xs text-white/70">{q}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3 flex items-center gap-1.5">
                <Globe size={12} className="text-blue-400" /> Languages
              </p>
              <div className="flex flex-wrap gap-2">
                {(expert.languages || []).map((lang: string) => (
                  <span key={lang} className="px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.15)' }}>
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {(expert.work_experience || []).length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3 flex items-center gap-1.5">
                  <Briefcase size={12} className="text-teal-400" /> Experience
                </p>
                <div className="space-y-3">
                  {(expert.work_experience || []).map((w: string, i: number) => (
                    <div key={i} className="relative pl-5">
                      {i < (expert.work_experience || []).length - 1 && (
                        <div className="absolute left-[7px] top-3 bottom-0 w-px" style={{ background: 'var(--border)' }} />
                      )}
                      <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: i === 0 ? '#14b8a6' : 'var(--surface-light)', border: `2px solid ${i === 0 ? '#14b8a6' : 'var(--border)'}` }}>
                        {i === 0 && <div className="w-1 h-1 rounded-full bg-white" />}
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'expertise' && (
          <>
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3 flex items-center gap-1.5">
                <Heart size={12} className="text-teal-400" /> Area of Expertise
              </p>
              <div className="flex flex-wrap gap-2">
                {(expert.expertise || []).map((tag: string) => (
                  <span key={tag} className="px-3 py-1.5 rounded-xl text-[11px] font-medium" style={{ background: 'var(--surface-light)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3 flex items-center gap-1.5">
                <MessageCircle size={12} className="text-purple-400" /> Specializations
              </p>
              <div className="flex flex-wrap gap-2">
                {(expert.specializations || []).map((s: string) => (
                  <span key={s} className="px-3 py-1.5 rounded-xl text-[11px] font-medium" style={{ background: 'rgba(139,92,246,0.08)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.15)' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {(expert.awards || []).length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)] mb-3 flex items-center gap-1.5">
                  <Award size={12} className="text-amber-400" /> Awards
                </p>
                <div className="space-y-2">
                  {(expert.awards || []).map((a: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 text-xs mt-0.5">🏆</span>
                      <p className="text-xs text-white/70">{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'reviews' && (
          <>
            {/* Write Review Button */}
            {!showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-teal-400 transition-all active:scale-[0.97]"
                style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}
              >
                ✍️ Write a Review
              </button>
            )}

            {/* Review Form */}
            {showReviewForm && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid rgba(20,184,166,0.25)' }}>
                <p className="text-xs font-bold text-white mb-3">Your Rating</p>
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setReviewRating(n)} className="transition-transform active:scale-90">
                      <Star size={28} className={n <= reviewRating ? 'text-amber-400' : 'text-white/20'} fill={n <= reviewRating ? '#fbbf24' : 'none'} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Share your experience (optional)..."
                  className="w-full bg-transparent text-sm text-white/80 outline-none resize-none placeholder:text-[var(--muted)] mb-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  rows={3}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowReviewForm(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold text-[var(--muted)]" style={{ border: '1px solid var(--border)' }}>Cancel</button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                    style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}
                  >
                    {reviewSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Submit
                  </button>
                </div>
              </div>
            )}

            {/* Reviews List */}
            {reviewsLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="text-teal-400 animate-spin" />
              </div>
            )}

            {!reviewsLoading && reviews.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[var(--muted)] text-sm">No reviews yet. Be the first!</p>
              </div>
            )}

            {reviews.map(review => (
              <div key={review.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-[11px] font-bold text-teal-400">
                      {review.userName[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{review.userName}</p>
                      <p className="text-[10px] text-[var(--muted)]">{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={10} className={n <= review.rating ? 'text-amber-400' : 'text-white/10'} fill={n <= review.rating ? '#fbbf24' : 'none'} />
                    ))}
                  </div>
                </div>
                {review.text && <p className="text-xs text-white/70 leading-relaxed">{review.text}</p>}
              </div>
            ))}
          </>
        )}

        {/* Book Session CTA */}
        <div className="text-center pt-4 pb-4">
          <button
            onClick={handleBookSession}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97] flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)', boxShadow: '0 4px 20px rgba(20,184,166,0.4)' }}
          >
            <Calendar size={18} /> Book a Session
          </button>
          <p className="text-[10px] text-[var(--muted)] mt-2">Sessions are confidential and secure</p>
        </div>
      </div>

      {/* ═══ Booking Modal ═══ */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => { if (bookingStatus !== 'loading') setShowBooking(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-t-3xl p-6 slide-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

            {bookingStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Session Booked! 🎉</h3>
                <p className="text-sm text-[var(--muted)] mb-1">
                  {bookingDate} · {selectedSlot?.startTime} - {selectedSlot?.endTime}
                </p>
                <p className="text-xs text-[var(--muted)] mb-1">with {expert.name}</p>
                <p className="text-xs text-teal-400 mb-6 capitalize">📹 {sessionMode} session</p>
                <button
                  onClick={() => { setShowBooking(false); setBookingStatus('idle'); }}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-1">Book Session</h3>
                <p className="text-xs text-[var(--muted)] mb-5">with {expert.name} · {expert.session_duration_mins || 45} min</p>

                {/* Session Mode */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Session Mode</p>
                <div className="flex gap-3 mb-5">
                  {[
                    { key: 'video' as const, label: 'Video', icon: Video },
                    { key: 'audio' as const, label: 'Audio', icon: Phone },
                    { key: 'chat' as const, label: 'Chat', icon: MessageSquare },
                  ].map(mode => (
                    <button
                      key={mode.key}
                      onClick={() => setSessionMode(mode.key)}
                      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-[0.95]"
                      style={{
                        background: sessionMode === mode.key
                          ? 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(20,184,166,0.1))'
                          : 'var(--surface-light)',
                        border: sessionMode === mode.key
                          ? '2px solid #14b8a6'
                          : '1px solid var(--border)',
                      }}
                    >
                      <mode.icon size={20} className={sessionMode === mode.key ? 'text-teal-400' : 'text-white/40'} />
                      <span className={`text-[11px] font-semibold ${sessionMode === mode.key ? 'text-teal-400' : 'text-white/40'}`}>{mode.label}</span>
                    </button>
                  ))}
                </div>

                {/* Date Picker */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Select Your Session Date</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5">
                  {getNext7Days().map(d => (
                    <button
                      key={d.date}
                      onClick={() => handleDateChange(d.date)}
                      className="flex flex-col items-center min-w-[52px] py-2.5 rounded-2xl transition-all"
                      style={{
                        background: bookingDate === d.date ? 'linear-gradient(135deg, #0f766e, #14b8a6)' : 'var(--surface-light)',
                        border: bookingDate === d.date ? '2px solid #14b8a6' : '1px solid var(--border)',
                      }}
                    >
                      <span className="text-[10px] text-white/60 font-medium">{d.day}</span>
                      <span className="text-base font-bold text-white">{d.num}</span>
                    </button>
                  ))}
                </div>

                {/* Time Slots */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Select Your Session Time</p>
                {slots.filter(s => s.dayOfWeek === new Date(bookingDate).getDay()).length === 0 ? (
                  <p className="text-xs text-red-400/80 py-4 text-center font-medium">No time slots available!</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {slots.filter(s => s.dayOfWeek === new Date(bookingDate).getDay()).map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => !slot.isBooked && setSelectedSlot(slot)}
                        disabled={slot.isBooked}
                        className="py-2 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: slot.isBooked
                            ? 'rgba(239,68,68,0.1)'
                            : selectedSlot?.id === slot.id
                            ? 'linear-gradient(135deg, #0f766e, #14b8a6)'
                            : 'var(--surface-light)',
                          color: slot.isBooked ? '#ef4444' : '#fff',
                          border: slot.isBooked ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border)',
                          opacity: slot.isBooked ? 0.5 : 1,
                        }}
                      >
                        {slot.startTime.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Notes (optional)</p>
                <textarea
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  placeholder="Briefly describe what you'd like to discuss..."
                  className="w-full bg-transparent text-sm text-white/80 outline-none resize-none placeholder:text-[var(--muted)] mb-4 p-3 rounded-xl"
                  style={{ background: 'var(--surface-light)', border: '1px solid var(--border)' }}
                  rows={2}
                />

                {bookingError && (
                  <p className="text-xs text-red-400 mb-3 flex items-center gap-1"><X size={12} /> {bookingError}</p>
                )}

                {/* Confirm */}
                <button
                  onClick={handleConfirmBooking}
                  disabled={!selectedSlot || bookingStatus === 'loading'}
                  className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}
                >
                  {bookingStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
                  Confirm Booking
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
