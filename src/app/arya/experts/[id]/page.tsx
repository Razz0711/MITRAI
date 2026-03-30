// ============================================
// MitrRAI - Expert Detail Page (API-backed)
// Profile with tabs: About, Expertise, Reviews
// + Availability calendar & Booking flow
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Clock, Globe, Award, Briefcase, GraduationCap, Heart, MessageCircle, Calendar, Loader2, Send, Check, X, Video, Phone, MessageSquare, User, FileText, CheckCircle } from 'lucide-react';

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
      {/* ── Header Area ── */}
      <div className="relative overflow-visible" style={{ background: 'linear-gradient(180deg, rgba(139,141,242,0.2) 0%, rgba(139,141,242,0) 100%)', paddingBottom: '20px' }}>
        
        {/* Back Button */}
        <div className="px-4 pt-4 relative z-10" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button onClick={() => router.push('/arya/experts')} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
        </div>

        {/* Centered Avatar Box */}
        <div className="text-center pt-2">
          <div
            className="w-[110px] h-[110px] rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white relative overflow-hidden shadow-xl"
            style={{
              background: expert.avatar_url?.startsWith('#') 
                ? `linear-gradient(135deg, ${expert.avatar_url}40, ${expert.avatar_url}10)`
                : 'linear-gradient(180deg, rgba(236,72,153,0.15) 0%, rgba(236,72,153,0.05) 100%)',
              border: '3px solid rgba(255,255,255,0.1)',
            }}
          >
            <span className="absolute top-2 text-[8px] font-black tracking-wider text-pink-400/80">MITRRAI+</span>
            {expert.avatar_url && !expert.avatar_url.startsWith('#') ? (
              <img src={expert.avatar_url} alt={expert.name} className="w-full h-full object-cover mt-3" />
            ) : (
              <span className="text-4xl font-bold text-white mt-2">{expert.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
            )}
          </div>
          
          <h1 className="text-[22px] font-bold text-[var(--foreground)] mb-1 leading-tight">{expert.name}</h1>
          <p className="text-[14px] font-semibold text-[var(--foreground)] opacity-80 mb-0.5">{expert.title}</p>
          <p className="text-[14px] font-bold text-[var(--foreground)]">{expert.experience_years} Years of Exp</p>

          <button
            onClick={handleBookSession}
            className="mt-5 px-8 py-3 rounded-2xl text-[15px] font-bold text-white transition-all active:scale-[0.97] shadow-lg shadow-indigo-500/20"
            style={{ background: '#8b8df2' }}
          >
            Book Session
          </button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex justify-around items-center px-6 mt-4 mb-6 border-b border-[var(--border)]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="pb-3 text-[16px] font-bold transition-all relative"
            style={{
              color: activeTab === tab.key ? '#ec4899' : 'var(--foreground)',
              opacity: activeTab === tab.key ? 1 : 0.6
            }}
          >
            {tab.label.replace(/\(\d+\)/, '')}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-[#ec4899]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 space-y-4">
        {activeTab === 'about' && (
          <div className="space-y-6 bg-[var(--surface)] p-6 rounded-3xl border border-[var(--glass-border)]">
            
            <div className="space-y-2">
              <h3 className="text-[17px] font-extrabold text-[var(--foreground)] flex items-center gap-2">
                <User size={20} className="text-black bg-white rounded-full p-0.5" /> About Me
              </h3>
              <p className="text-[14px] text-[var(--foreground)] opacity-80 leading-relaxed pl-7 pb-4 border-b border-[var(--border)]">
                {expert.about || "No details provided."}
                <br/><span className="text-[#ec4899] font-bold mt-1 inline-block cursor-pointer underline decoration-[#ec4899] underline-offset-2">Read More...</span>
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-[17px] font-extrabold text-[var(--foreground)] flex items-center gap-2">
                <FileText size={20} className="text-[var(--muted)]" /> Qualification
              </h3>
              <ul className="list-disc pl-11 space-y-1.5 text-[14px] font-semibold text-[var(--foreground)] pb-4 border-b border-[var(--border)]">
                {(expert.qualifications || []).map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-[17px] font-extrabold text-[var(--foreground)] flex items-center gap-2">
                <MessageSquare size={20} className="text-[var(--muted)]" /> Languages Known
              </h3>
              <p className="text-[14px] font-semibold text-[var(--foreground)] pl-7 pb-4 border-b border-[var(--border)]">
                {(expert.languages || []).join(', ')}
              </p>
            </div>

            {(expert.work_experience || []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[17px] font-extrabold text-[var(--foreground)] flex items-center gap-2">
                  <Award size={20} className="text-[var(--muted)]" /> Experience
                </h3>
                <ul className="list-disc pl-11 space-y-1.5 text-[14px] font-semibold text-[var(--foreground)]">
                  {(expert.work_experience || []).map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'expertise' && (
          <div className="space-y-6 bg-[var(--surface)] p-6 rounded-3xl border border-[var(--glass-border)]">
            
            <div className="space-y-3">
              <h3 className="text-[17px] font-extrabold text-[var(--foreground)] flex items-center gap-2">
                <User size={20} className="text-black bg-white rounded-full p-0.5" /> Area of Expertise
              </h3>
              <div className="flex flex-wrap gap-2.5 pl-7 pb-4 border-b border-[var(--border)]">
                {(expert.expertise || []).map((tag: string) => (
                  <span key={tag} className="px-5 py-2.5 rounded-xl text-[13px] font-bold flex-grow text-center" style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid rgba(236,72,153,0.3)' }}>
                    {tag}
                  </span>
                ))}
                <span className="w-full text-[#ec4899] font-bold text-[13px] mt-2 cursor-pointer underline decoration-[#ec4899] underline-offset-4">Show More</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[17px] font-extrabold text-[var(--foreground)] flex items-center gap-2">
                <CheckCircle size={20} className="text-[var(--muted)]" /> Specializations
              </h3>
              <div className="flex flex-wrap gap-2.5 pl-7 pb-4 border-b border-[var(--border)]">
                {(expert.specializations || []).map((s: string) => (
                  <span key={s} className="px-5 py-2.5 rounded-xl text-[13px] font-bold flex-grow text-center" style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid rgba(236,72,153,0.3)' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {(expert.awards || []).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[17px] font-extrabold text-[var(--foreground)] flex items-center gap-2">
                  <Award size={20} className="text-[var(--muted)]" /> Awards & Recognitions
                </h3>
                <ul className="list-disc pl-11 space-y-1.5 text-[14px] font-semibold text-[var(--foreground)]">
                  {(expert.awards || []).map((a: string, i: number) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            
            {/* Stats Block like Screenshot */}
            <div className="bg-[var(--surface)] p-6 rounded-3xl border border-[var(--glass-border)] flex gap-5 items-center">
              <div className="flex flex-col items-center pl-1">
                <h2 className="text-[42px] font-black text-[var(--foreground)] leading-none -ml-1">
                  {expert.rating?.toFixed(1) || '0.0'}<span className="text-[20px] text-[var(--muted)] relative -top-3">/5</span>
                </h2>
                <p className="text-[12px] font-bold text-[var(--muted)] mt-1 mb-2 tracking-wide">Rating</p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={14} className="text-[#ec4899]" fill={n <= Math.round(expert.rating || 0) ? '#ec4899' : 'transparent'} strokeWidth={n <= Math.round(expert.rating || 0) ? 0 : 2} />
                  ))}
                </div>
              </div>
              
              <div className="flex-1 space-y-2 border-l border-[var(--border)] pl-5 py-1">
                {[
                  { stars: 5, pct: '81%' },
                  { stars: 4, pct: '9%' },
                  { stars: 3, pct: '4%' },
                  { stars: 2, pct: '4%' },
                  { stars: 1, pct: '0%' },
                ].map(row => (
                  <div key={row.stars} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[var(--foreground)] w-2">{row.stars}</span>
                    <Star size={10} className="text-[#ec4899]" fill="#ec4899" strokeWidth={0} />
                    <div className="flex-1 h-2 bg-[var(--background)] rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-[#ec4899] rounded-full" style={{ width: row.pct }} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--muted)] w-7 text-right">{row.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Write Review Button */}
            {!showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="w-full py-4 rounded-[20px] text-[14px] font-bold text-[#ec4899] transition-all active:scale-[0.97]"
                style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}
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
          </div>
        )}

        {/* Book Session CTA */}
        <div className="text-center pt-2 pb-6">
          <button
            onClick={handleBookSession}
            className="w-full py-[18px] rounded-[24px] text-[16px] font-extrabold text-white transition-all active:scale-[0.97]"
            style={{ background: '#8b8df2', boxShadow: '0 8px 24px rgba(139,141,242,0.25)' }}
          >
            Book Session
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
                <p className="text-[14px] font-bold text-[var(--foreground)] mb-3 text-center">Which type of mode would you want?</p>
                <div className="flex gap-3 mb-6">
                  {[
                    { key: 'video' as const, label: 'Video', icon: Video },
                    { key: 'audio' as const, label: 'Audio', icon: Phone },
                    { key: 'chat' as const, label: 'Chat', icon: MessageSquare },
                  ].map(mode => (
                    <button
                      key={mode.key}
                      onClick={() => setSessionMode(mode.key)}
                      className="flex-1 flex flex-col items-center justify-center gap-2.5 py-4 rounded-[20px] transition-all"
                      style={{
                        background: 'var(--surface)',
                        border: sessionMode === mode.key ? '2px solid #ec4899' : '1px solid var(--border)',
                        boxShadow: sessionMode === mode.key ? '0 4px 15px rgba(236,72,153,0.1)' : 'none'
                      }}
                    >
                      <mode.icon size={24} className={sessionMode === mode.key ? 'text-[#foreground]' : 'text-white/40'} strokeWidth={2.5} />
                      <span className={`text-[13px] font-extrabold ${sessionMode === mode.key ? 'text-[var(--foreground)]' : 'text-white/40'}`}>{mode.label}</span>
                    </button>
                  ))}
                </div>

                {/* Date Picker */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[14px] font-bold text-[var(--foreground)]">Select Your Session Date</p>
                  <Calendar size={18} className="text-[#ec4899]" />
                </div>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar mb-6 pb-2">
                  {getNext7Days().map(d => (
                    <button
                      key={d.date}
                      onClick={() => handleDateChange(d.date)}
                      className="flex flex-col items-center min-w-[64px] py-3.5 rounded-[20px] transition-all shrink-0"
                      style={{
                        background: bookingDate === d.date ? '#ec4899' : 'var(--surface)',
                        border: bookingDate === d.date ? '1px solid #ec4899' : '1px solid var(--border)',
                        boxShadow: bookingDate === d.date ? '0 4px 15px rgba(236,72,153,0.3)' : 'none'
                      }}
                    >
                      <span className={`text-[12px] font-bold ${bookingDate === d.date ? 'text-white/90' : 'text-[var(--muted)]'}`}>{d.day}</span>
                      <span className={`text-[18px] font-black mt-1 ${bookingDate === d.date ? 'text-white' : 'text-[var(--foreground)]'}`}>{d.num}</span>
                    </button>
                  ))}
                </div>

                {/* Time Slots */}
                <p className="text-[14px] font-bold text-[var(--foreground)] mb-4">Select Your Session Time</p>
                {slots.filter(s => s.dayOfWeek === new Date(bookingDate).getDay()).length === 0 ? (
                  <p className="text-[14px] text-[#ec4899] py-3 text-center font-bold">No time slots available!</p>
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
                            ? 'var(--border)'
                            : selectedSlot?.id === slot.id
                            ? '#8b8df2'
                            : 'var(--surface)',
                          color: slot.isBooked ? 'var(--muted)' : '#fff',
                          border: slot.isBooked ? '1px solid transparent' : selectedSlot?.id === slot.id ? '1px solid #8b8df2' : '1px solid var(--border)',
                          opacity: slot.isBooked ? 0.3 : 1,
                        }}
                      >
                        {slot.startTime.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <p className="text-[13px] font-bold text-[var(--foreground)] mb-3">Notes (optional)</p>
                <textarea
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  placeholder="Briefly describe what you'd like to discuss..."
                  className="w-full bg-transparent text-[14px] text-white/80 outline-none resize-none placeholder:text-[var(--muted)] mb-5 p-4 rounded-2xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  rows={2}
                />

                {bookingError && (
                  <p className="text-[13px] font-bold text-red-400 mb-4 flex items-center gap-1.5"><X size={14} /> {bookingError}</p>
                )}

                {/* Confirm */}
                <button
                  onClick={handleConfirmBooking}
                  disabled={!selectedSlot || bookingStatus === 'loading'}
                  className="w-full py-[18px] rounded-[24px] text-[16px] font-extrabold text-white transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: '#8b8df2', boxShadow: '0 8px 24px rgba(139,141,242,0.25)' }}
                >
                  {bookingStatus === 'loading' ? <Loader2 size={18} className="animate-spin" /> : null}
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
