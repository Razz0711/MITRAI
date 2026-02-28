// ============================================
// MitrAI - Contact & Feedback Page
// ============================================

'use client';

import { useState } from 'react';

export default function FeedbackPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'feedback' | 'bug' | 'feature' | 'contact'>('feedback');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, type, rating, message }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.error || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error('submitFeedback:', err);
      alert('Something went wrong. Please try again.');
    }

    setSending(false);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="card p-8">
          <h2 className="text-xl font-bold mb-2">
            <span className="gradient-text">Thank You</span>
          </h2>
          <p className="text-xs text-[var(--muted)] mb-4 max-w-sm mx-auto">
            Your {type} has been received. We appreciate your help improving MitrAI.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setMessage('');
                setRating(0);
                setType('feedback');
              }}
              className="btn-primary text-xs"
            >
              Send Another
            </button>
            <a href="/" className="btn-secondary text-xs inline-block">
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-1">
          <span className="gradient-text">Contact & Feedback</span>
        </h1>
        <p className="text-xs text-[var(--muted)]">Help us make MitrAI better</p>
      </div>

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="card p-4 space-y-4">
        {/* Type Selection */}
        <div>
          <label className="label">What would you like to share?</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {([
              { value: 'feedback', label: 'Feedback' },
              { value: 'bug', label: 'Bug Report' },
              { value: 'feature', label: 'Feature Idea' },
              { value: 'contact', label: 'Contact' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  type === opt.value
                    ? 'bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary-light)]'
                    : 'bg-white/5 border border-[var(--border)] text-[var(--muted)] hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="label">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name (optional)"
            className="input-field"
          />
        </div>

        {/* Email */}
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com (optional, for us to reply)"
            className="input-field"
          />
        </div>

        {/* Rating */}
        {type === 'feedback' && (
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`w-9 h-9 rounded-lg text-sm transition-all ${
                    star <= rating
                      ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 scale-105'
                      : 'bg-white/5 border border-[var(--border)] text-[var(--muted)] hover:bg-white/10'
                  }`}
                >
                  {star}
                </button>
              ))}
              {rating > 0 && (
                <span className="self-center text-xs text-[var(--muted)] ml-1">
                  {['', 'Needs work', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="label">
            {type === 'bug' ? 'Describe the bug *' :
             type === 'feature' ? 'Describe your idea *' :
             type === 'contact' ? 'Your message *' :
             'Your feedback *'}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              type === 'bug' ? 'What happened? What did you expect? Steps to reproduce...' :
              type === 'feature' ? 'What feature would you like to see? How would it help?' :
              type === 'contact' ? 'How can we help you?' :
              'Tell us what you think about MitrAI...'
            }
            rows={5}
            className="input-field resize-none"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="btn-primary w-full"
        >
          {sending ? 'Sending...' : 'Send Feedback'}
        </button>
      </form>

      {/* Contact for Queries */}
      <div className="mt-6 card p-4">
        <h3 className="text-sm font-semibold mb-3 text-center">Have a Query?</h3>
        <p className="text-xs text-[var(--muted)] text-center mb-3">Reach out to us anytime</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="https://wa.me/917061001946?text=Hi%2C%20I%20have%20a%20query%20about%20MitrAI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-xs font-medium text-green-400 hover:bg-green-500/25 transition-all"
          >
            💬 WhatsApp
          </a>
          <a
            href="mailto:rajkumaratsvnit@gmail.com?subject=MitrAI%20Query"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs font-medium text-blue-400 hover:bg-blue-500/25 transition-all"
          >
            ✉️ Email
          </a>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-4 card p-4">
        <h3 className="text-sm font-semibold mb-3">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {[
            { q: 'Is MitrAI free to use?', a: 'Yes! MitrAI is completely free for all students.' },
            { q: 'How does the matching work?', a: 'Our AI analyzes 5 dimensions — subjects, schedule, study style, goals, and personality — to find your ideal study buddy with a 100-point scoring system.' },
            { q: 'Are voice/video calls recorded?', a: 'No. Calls are powered by Jitsi Meet and are completely private. Nothing is recorded or stored.' },
            { q: 'Can I suggest new features?', a: 'Absolutely! Use the Feature Idea option above to share your ideas. We love hearing from our users.' },
          ].map((faq, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/5">
              <p className="text-sm font-semibold text-[var(--foreground)] mb-1">{faq.q}</p>
              <p className="text-sm text-[var(--muted)]">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
