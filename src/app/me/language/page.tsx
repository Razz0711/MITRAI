'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';

const LANGUAGES = [
  { id: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { id: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { id: 'mr', label: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { id: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { id: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
];

export default function LanguagePage() {
  const router = useRouter();
  const [selected, setSelected] = useState('en');

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--surface)] border border-[var(--glass-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-bold text-[var(--foreground)]">Change Language</h1>
      </div>

      <p className="text-xs text-[var(--muted)] mb-4 px-1">Choose your preferred language for the app interface.</p>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
        {LANGUAGES.map((lang, i) => (
          <div key={lang.id}>
            {i > 0 && <div className="h-px bg-[var(--border)]" />}
            <button
              onClick={() => setSelected(lang.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
            >
              <span className="text-2xl">{lang.flag}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">{lang.label}</p>
                <p className="text-[10px] text-[var(--muted)]">{lang.native}</p>
              </div>
              {selected === lang.id && (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[var(--muted)] text-center mt-4 px-4">
        Currently only English is fully supported. More languages coming soon!
      </p>
    </div>
  );
}
