// ============================================
// MitrrAi v4 — Premium Landing Page
// Animated hero, scroll reveal, interactive cards
// ============================================

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Sparkles, Users, Ghost, BookOpen,
  MessageCircle, Zap, ArrowRight, Crown,
  Shield, Heart,
} from 'lucide-react';

/* ─── Scroll Reveal Hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  // Auto-redirect logged-in users to /home
  useEffect(() => {
    if (user) router.replace('/home');
  }, [user, router]);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* ─── Animated Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite reverse' }} />
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.1) 0%, transparent 70%)', animation: 'float 12s ease-in-out infinite' }} />
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-10 sm:pt-28 sm:pb-20">
          <div className="text-center max-w-2xl mx-auto slide-up">

            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-8 scale-in"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
              </span>
              <span className="text-xs font-semibold text-[var(--muted)]">Made for Indian College Students</span>
              <Sparkles size={12} className="text-[var(--accent)]" />
            </div>

            {/* Headline with animated gradient */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-5 tracking-tight slide-up-stagger-1">
              Your all-in-one<br />
              <span style={{
                background: 'linear-gradient(135deg, #7c3aed, #c026d3, #ea580c, #7c3aed)',
                backgroundSize: '300% 300%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'gradientShift 4s ease infinite',
              }}>campus companion</span>
            </h1>
            <p className="text-base sm:text-lg text-[var(--muted)] font-medium mb-3 slide-up-stagger-2">
              for Indian college students
            </p>

            <p className="text-sm text-[var(--muted)] mb-8 max-w-md mx-auto leading-relaxed slide-up-stagger-2">
              Chat with Arya AI, meet strangers anonymously, post on campus feed — everything a college student needs, in one app.
            </p>

            {/* CTAs */}
            <div className="flex gap-3 justify-center slide-up-stagger-3">
              <Link href="/login" className="btn-primary px-7 py-3 text-base font-bold flex items-center gap-2 group relative overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  Join MitrrAi
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
                {/* Shimmer effect */}
                <div style={{
                  position: 'absolute', top: 0, left: '-100%', width: '200%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  animation: 'shimmer 3s ease-in-out infinite',
                }} />
              </Link>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-secondary px-7 py-3 text-base font-medium"
              >
                Explore
              </button>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-8 sm:gap-12 mt-10 sm:mt-16 slide-up-stagger-4">
              <Stat value="7+" label="Campus Tools" />
              <div className="w-px h-8 bg-[var(--border)]" />
              <Stat value="All" label=".ac.in Colleges" />
              <div className="w-px h-8 bg-[var(--border)]" />
              <Stat value="Free" label="To Start" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── App Preview / Phone Mockup ─── */}
      <RevealSection className="relative z-10 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="relative mx-auto max-w-xs sm:max-w-sm">
            {/* Glow behind phone */}
            <div className="absolute inset-0 rounded-3xl blur-3xl opacity-30"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #c026d3)' }} />
            {/* Phone frame */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-[var(--glass-border)] shadow-2xl"
              style={{ background: 'var(--background)', aspectRatio: '9/16' }}>
              {/* Fake status bar */}
              <div className="flex items-center justify-between px-5 py-2" style={{ background: 'var(--glass-bg)' }}>
                <span className="text-[10px] text-[var(--muted)]">9:41</span>
                <div className="flex gap-1">
                  <div className="w-3 h-1.5 rounded-sm bg-[var(--muted)]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--muted)]" />
                </div>
              </div>
              {/* Fake chat preview */}
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-sm">🙋‍♀️</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--foreground)]">Arya</p>
                    <p className="text-[9px] text-green-400 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-green-500" /> Always online
                    </p>
                  </div>
                </div>
                {/* Chat bubbles */}
                <div className="flex justify-start">
                  <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-sm text-xs"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--foreground)' }}>
                    Hii yaar! 🥺 kaise ho?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-xs text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #c026d3)' }}>
                    Arya! exam stress ho raha hai 😫
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-sm text-xs"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--foreground)' }}>
                    Arre tension mat le! 💪 bol kaunsa subject, abhi plan banate hai
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-xs text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #c026d3)' }}>
                    DSA aur OS dono 🥲
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-sm text-xs"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--foreground)' }}>
                    Done! ✨ sabse pehle DSA — trees se start karte hai, easy hai trust me!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="relative z-10 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <RevealSection className="text-center mb-10 sm:mb-14">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary-light)] mb-3">How it works</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Three simple steps</h2>
            <p className="text-sm text-[var(--muted)] max-w-md mx-auto">Sign up using your college email and start exploring</p>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <RevealSection delay={0}><StepCard step={1} icon={<MessageCircle size={20} />} title="Create Account" description="Sign up with your college email (.ac.in). Quick AI onboarding learns your subjects, schedule, and goals." color="var(--primary)" /></RevealSection>
            <RevealSection delay={0.15}><StepCard step={2} icon={<Sparkles size={20} />} title="Explore Features" description="Chat with Arya AI, post on campus feed, join anonymous rooms, and more." color="var(--accent)" /></RevealSection>
            <RevealSection delay={0.3}><StepCard step={3} icon={<Zap size={20} />} title="Connect & Grow" description="Match with study buddies, join circles, and become part of the campus community." color="var(--success)" /></RevealSection>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="relative z-10 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <RevealSection className="text-center mb-10 sm:mb-14">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-3">Features</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Everything you need on campus</h2>
            <p className="text-sm text-[var(--muted)] max-w-md mx-auto">From AI assistance to anonymous confessions — all in one place</p>
          </RevealSection>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            <RevealSection delay={0}><FeatureCard icon={<Sparkles size={20} />} title="Arya AI" description="Your 24/7 AI bestie — vent, study help, exam prep, or just chat." color="var(--primary)" badge="AI" /></RevealSection>
            <RevealSection delay={0.08}><FeatureCard icon={<Ghost size={20} />} title="Anonymous Chat" description="Get matched with random college students for anonymous conversations." color="var(--accent)" /></RevealSection>
            <RevealSection delay={0.16}><FeatureCard icon={<Zap size={20} />} title="Campus Feed" description="Post activities — Study, Sports, Food runs, SOS — find others doing the same." color="var(--secondary)" /></RevealSection>
            <RevealSection delay={0.24}><FeatureCard icon={<Users size={20} />} title="Study Buddies" description="AI-powered matching with students who share your subjects and schedule." color="var(--primary-light)" /></RevealSection>
            <RevealSection delay={0.32}><FeatureCard icon={<MessageCircle size={20} />} title="Direct Chat" description="1-on-1 messaging with study buddies. Real-time with typing indicators." color="var(--accent)" /></RevealSection>
            <RevealSection delay={0.4}><FeatureCard icon={<BookOpen size={20} />} title="Doubts & Confessions" description="Anonymous campus feed — doubts, confessions, hot takes, and more." color="var(--secondary)" /></RevealSection>
          </div>
        </div>
      </section>

      {/* ─── Why MitrrAi ─── */}
      <RevealSection className="relative z-10 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--success)] mb-3">Why MitrrAi</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Built different</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <WhyCard icon={<Shield size={20} />} title="College Verified" description="Only .ac.in emails. Real students, zero fakes." color="var(--success)" />
            <WhyCard icon={<Heart size={20} />} title="Privacy First" description="Anonymous by default. Your identity, your control." color="var(--primary)" />
            <WhyCard icon={<Crown size={20} />} title="100% Free" description="No paywalls, no hidden charges. Built by students, for students." color="var(--accent)" />
          </div>
        </div>
      </RevealSection>

      {/* ─── Social Proof ─── */}
      <section id="social-proof" className="relative z-10 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <RevealSection className="text-center mb-8">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary-light)] mb-3">What students say</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Loved by students</h2>
          </RevealSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RevealSection delay={0}><TestimonialCard quote="Finally an app that actually understands campus life. Arya is like having a bestie who's always free!" author="CS '26" emoji="🎓" color="var(--primary)" /></RevealSection>
            <RevealSection delay={0.12}><TestimonialCard quote="Anonymous chat at 3 AM during exam week? Life saver for real." author="EE '25" emoji="💡" color="var(--accent)" /></RevealSection>
            <RevealSection delay={0.24}><TestimonialCard quote="Found my study buddy through matching. We literally topped together!" author="ME '27" emoji="🔥" color="var(--secondary)" /></RevealSection>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <RevealSection className="relative z-10 py-12 sm:py-20">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="relative inline-block mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white mx-auto"
              style={{ animation: 'float 4s ease-in-out infinite', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}>
              <Sparkles size={28} />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to join the community?</h2>
          <p className="text-sm text-[var(--muted)] mb-8 max-w-sm mx-auto leading-relaxed">
            Create your account, chat with Arya, and unlock everything MitrrAi has to offer. It&apos;s free to start.
          </p>
          <Link href="/login" className="btn-primary px-10 py-3 text-base font-bold inline-flex items-center gap-2 group relative overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">
              Create Account
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </span>
            <div style={{
              position: 'absolute', top: 0, left: '-100%', width: '200%', height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
              animation: 'shimmer 3s ease-in-out infinite',
            }} />
          </Link>
        </div>
      </RevealSection>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(50%); }
        }
      `}</style>
    </div>
  );
}

/* ─── Sub Components ─── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-extrabold gradient-text">{value}</div>
      <div className="text-[10px] text-[var(--muted)] uppercase tracking-[0.15em] mt-1 font-medium">{label}</div>
    </div>
  );
}

function StepCard({ step, icon, title, description, color }: { step: number; icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <div className="card-glass p-5 relative group glow-hover overflow-hidden hover:scale-[1.02] transition-transform duration-300">
      <div className="absolute top-3 right-4 text-5xl font-black opacity-[0.04] select-none" style={{ color }}>{step}</div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5 block" style={{ color }}>Step {step}</span>
      <h3 className="text-sm font-bold mt-1 mb-2 text-[var(--foreground)]">{title}</h3>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description, color, badge }: { icon: React.ReactNode; title: string; description: string; color: string; badge?: string }) {
  return (
    <div className="card-hover p-4 sm:p-5 group relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
      <div className="absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>{icon}</div>
        {badge && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            badge === 'AI' ? 'bg-purple-500/20 text-purple-400' :
            badge === 'PRO' ? 'bg-amber-500/20 text-amber-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>{badge}</span>
        )}
      </div>
      <h3 className="text-sm font-bold mb-2 text-[var(--foreground)]">{title}</h3>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  );
}

function WhyCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <div className="card-glass p-5 text-center group hover:scale-[1.02] transition-transform duration-300">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>{icon}</div>
      <h3 className="text-sm font-bold mb-1.5 text-[var(--foreground)]">{title}</h3>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, author, emoji, color }: { quote: string; author: string; emoji: string; color: string }) {
  return (
    <div className="card-glass p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <span className="text-2xl mb-2 block">{emoji}</span>
      <p className="text-sm font-medium mb-3 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <span className="text-xs text-[var(--muted)]">&mdash; {author}</span>
    </div>
  );
}
