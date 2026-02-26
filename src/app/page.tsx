// ============================================
// MitrAI - Landing Page
// ============================================

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[var(--primary)]/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-[var(--secondary)]/15 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-sm text-[var(--primary-light)] mb-8 fade-in">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              AI-Powered Study Matching
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-7xl font-bold leading-tight mb-6 slide-up">
              Find Your Perfect{' '}
              <span className="gradient-text">Study Buddy</span>
            </h1>

            <p className="text-xl text-[var(--muted)] mb-10 max-w-2xl mx-auto leading-relaxed fade-in">
              MitrAI uses AI agents to match you with the ideal study partner.
              Complementary strengths, compatible schedules, shared goals — all powered by intelligent matching.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center fade-in">
              <Link href="/onboarding" className="btn-primary text-lg px-8 py-4 pulse-glow">
                🚀 Get Started Free
              </Link>
              <Link href="/dashboard" className="btn-secondary text-lg px-8 py-4">
                📊 View Demo Dashboard
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-xl mx-auto mt-16 fade-in">
              <Stat value="100+" label="Students Matched" />
              <Stat value="95%" label="Match Accuracy" />
              <Stat value="24/7" label="AI Assistance" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              How <span className="gradient-text">MitrAI</span> Works
            </h2>
            <p className="text-[var(--muted)] text-lg">Four simple steps to find your study buddy</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StepCard
              step={1}
              icon="💬"
              title="Chat & Onboard"
              description="Tell our AI agent about yourself — your subjects, goals, schedule, and study style through a friendly chat."
            />
            <StepCard
              step={2}
              icon="🧠"
              title="AI Agent Matching"
              description="Your personal AI agent analyzes 100+ factors to find the most compatible study partners for you."
            />
            <StepCard
              step={3}
              icon="📅"
              title="Get Study Plan"
              description="Receive a personalized weekly study plan that includes both solo and buddy sessions."
            />
            <StepCard
              step={4}
              icon="🎯"
              title="Study Together"
              description="Join sessions with your buddy and an AI assistant that helps when you're stuck."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 relative bg-gradient-to-b from-transparent via-[var(--primary)]/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Powered by <span className="gradient-text">AI Agents</span>
            </h2>
            <p className="text-[var(--muted)] text-lg">Not just matching — intelligent study partnership</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon="🤖"
              title="Personal AI Agent"
              description="Each student gets their own AI agent that represents their interests and finds the best matches."
            />
            <FeatureCard
              icon="🔄"
              title="Complementary Matching"
              description="We match students who are strong where you're weak and vice versa — mutual learning!"
            />
            <FeatureCard
              icon="📊"
              title="100-Point Scoring"
              description="Subject, schedule, style, goals, personality — we score across 5 dimensions for accurate matches."
            />
            <FeatureCard
              icon="📚"
              title="AI Study Plans"
              description="Get weekly study plans that coordinate solo and buddy sessions for maximum learning."
            />
            <FeatureCard
              icon="💡"
              title="In-Session AI"
              description="An AI assistant joins your study sessions to help explain concepts, generate questions, and keep you on track."
            />
            <FeatureCard
              icon="📈"
              title="Progress Tracking"
              description="Track your progress, get feedback, and adjust your study strategy with AI-powered insights."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="glass-card p-12 pulse-glow">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Find Your <span className="gradient-text">Study Buddy</span>?
            </h2>
            <p className="text-[var(--muted)] text-lg mb-8">
              Join MitrAI today and let AI find your perfect study partner. It takes less than 2 minutes!
            </p>
            <Link href="/onboarding" className="btn-primary text-lg px-10 py-4">
              🚀 Start Now — It&apos;s Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 text-center text-[var(--muted)] text-sm">
          <p>© 2026 MitrAI — AI-Powered Study Buddy Matching. Built with ❤️ for students.</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold gradient-text">{value}</div>
      <div className="text-sm text-[var(--muted)]">{label}</div>
    </div>
  );
}

function StepCard({ step, icon, title, description }: { step: number; icon: string; title: string; description: string }) {
  return (
    <div className="glass-card-hover p-6 text-center relative">
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-sm font-bold">
        {step}
      </div>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="glass-card-hover p-6">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  );
}
