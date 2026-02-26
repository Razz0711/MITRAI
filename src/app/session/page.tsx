// ============================================
// MitrAI - In-Session AI Assistant Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatInterface from '@/components/ChatInterface';
import { ChatMessage, StudentProfile } from '@/lib/types';

export default function SessionPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [goal, setGoal] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [student1Id, setStudent1Id] = useState('');
  const [student2Id, setStudent2Id] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStarted) {
      interval = setInterval(() => setSessionTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStarted]);

  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setAllStudents(data.data);
        const savedStudent = localStorage.getItem('mitrai_student_id');
        const savedBuddy = localStorage.getItem('mitrai_buddy_id');
        if (savedStudent) setStudent1Id(savedStudent);
        if (savedBuddy) setStudent2Id(savedBuddy);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const startSession = () => {
    if (!topic) return;
    setSessionStarted(true);
    setSessionTime(0);

    const welcomeMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: `🎯 Study Session Started!\n\n📚 Topic: ${topic}\n🎯 Goal: ${goal || 'Learn and practice together'}\n\nI'm your AI study assistant for this session. I'm here to:\n• Help explain concepts when you're stuck\n• Generate practice questions\n• Keep you on track\n\nAsk me anything about ${topic}! Let's make this session count! 💪`,
      timestamp: Date.now(),
    };
    setMessages([welcomeMsg]);
  };

  const endSession = () => {
    const minutes = Math.floor(sessionTime / 60);
    const summaryMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: `📊 Session Summary\n━━━━━━━━━━━━━━━━\n\n⏱️ Duration: ${minutes} minutes\n📚 Topic: ${topic}\n🎯 Goal: ${goal || 'Learn and practice'}\n💬 Messages: ${messages.length}\n\n🌟 Great session! Keep up the momentum.\n\nRemember to:\n• Review what you learned today\n• Note down any remaining doubts\n• Plan your next session topic\n\nSee you next time! 👋`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, summaryMsg]);
    setSessionStarted(false);
  };

  const handleSendMessage = async (userMessage: string) => {
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const chatHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));
      chatHistory.push({ role: 'user', content: userMessage });

      const res = await fetch('/api/session-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student1Id,
          student2Id,
          topic,
          goal: goal || 'Learn and practice together',
          message: userMessage,
          chatHistory,
        }),
      });

      const data = await res.json();
      const response = data.data?.response || "I'm having trouble right now. Could you rephrase your question?";

      const aiMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: "Oops! Something went wrong. Try asking again? 😅",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!sessionStarted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">Study Session</span> 💬
          </h1>
          <p className="text-[var(--muted)]">Start a study session with AI assistance</p>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="text-sm text-[var(--muted)] mb-1 block">What topic are you studying? *</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Calculus - Integration, Organic Chemistry, Newton's Laws..."
              className="input-field"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--muted)] mb-1 block">Session Goal (optional)</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Understand integration by parts, solve 10 problems..."
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[var(--muted)] mb-1 block">Student 1 (optional)</label>
              <select value={student1Id} onChange={(e) => setStudent1Id(e.target.value)} className="input-field text-sm">
                <option value="">Select...</option>
                {allStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-[var(--muted)] mb-1 block">Student 2 (optional)</label>
              <select value={student2Id} onChange={(e) => setStudent2Id(e.target.value)} className="input-field text-sm">
                <option value="">Select...</option>
                {allStudents.filter(s => s.id !== student1Id).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={startSession}
            disabled={!topic}
            className="btn-primary w-full text-lg py-4"
          >
            🚀 Start Study Session
          </button>
        </div>

        {/* Quick Topics */}
        <div className="mt-6">
          <p className="text-sm text-[var(--muted)] mb-3">Quick start topics:</p>
          <div className="flex flex-wrap gap-2">
            {['Calculus', 'Organic Chemistry', 'Physics - Mechanics', 'Trigonometry', 'Thermodynamics', 'Genetics'].map(t => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-[var(--border)] text-sm hover:bg-white/10 hover:border-[var(--primary)] transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Session Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-[var(--success)] animate-pulse" />
          <div>
            <p className="text-sm font-medium">📚 {topic}</p>
            <p className="text-xs text-[var(--muted)]">{goal || 'Study session in progress'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-[var(--primary-light)]">⏱ {formatTime(sessionTime)}</span>
          <button onClick={endSession} className="px-4 py-2 rounded-xl bg-[var(--error)]/20 text-[var(--error)] text-sm font-medium hover:bg-[var(--error)]/30 transition-all">
            End Session
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder={`Ask about ${topic}...`}
        />
      </div>
    </div>
  );
}
