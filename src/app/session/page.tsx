// ============================================
// MitrAI - In-Session AI Assistant Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import ChatInterface from '@/components/ChatInterface';
import { ChatMessage, StudentProfile } from '@/lib/types';

const CallRoom = dynamic(() => import('@/components/CallRoom'), { ssr: false });

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
  const [callMode, setCallMode] = useState<'voice' | 'video' | null>(null);
  const [studentName, setStudentName] = useState('');

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
        const savedName = localStorage.getItem('mitrai_student_name');
        if (savedStudent) setStudent1Id(savedStudent);
        if (savedBuddy) setStudent2Id(savedBuddy);
        if (savedName) setStudentName(savedName);
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
      content: `Study Session Started\n\nTopic: ${topic}\nGoal: ${goal || 'Learn and practice together'}\n\nI'm your AI study assistant. I can:\n- Explain concepts when you're stuck\n- Generate practice questions\n- Keep you on track\n\nAsk me anything about ${topic}.`,
      timestamp: Date.now(),
    };
    setMessages([welcomeMsg]);
  };

  const endSession = () => {
    const minutes = Math.floor(sessionTime / 60);
    const summaryMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: `Session Summary\n\nDuration: ${minutes} minutes\nTopic: ${topic}\nGoal: ${goal || 'Learn and practice'}\nMessages: ${messages.length}\n\nGreat session. Remember to:\n- Review what you learned today\n- Note remaining questions\n- Plan your next session topic`,
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
        content: "Something went wrong. Try asking again.",
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
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold mb-1">
            <span className="gradient-text">Study Session</span>
          </h1>
          <p className="text-xs text-[var(--muted)]">Start a study session with AI assistance</p>
        </div>

        <div className="card p-4 space-y-3">
          <div>
            <label className="label">Topic *</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Calculus - Integration, Organic Chemistry..."
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Goal (optional)</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Understand integration by parts..."
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Student 1</label>
              <select value={student1Id} onChange={(e) => setStudent1Id(e.target.value)} className="input-field text-xs">
                <option value="">Select...</option>
                {allStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Student 2</label>
              <select value={student2Id} onChange={(e) => setStudent2Id(e.target.value)} className="input-field text-xs">
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
            className="btn-primary w-full"
          >
            Start Session
          </button>
        </div>

        {/* Quick Topics */}
        <div className="mt-4">
          <p className="text-xs text-[var(--muted)] mb-2">Quick start:</p>
          <div className="flex flex-wrap gap-1.5">
            {['Calculus', 'Organic Chemistry', 'Physics - Mechanics', 'Trigonometry', 'Thermodynamics', 'Genetics'].map(t => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-[var(--border)] text-xs hover:bg-white/10 hover:border-[var(--primary)] transition-all"
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
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse" />
          <div>
            <p className="text-xs font-medium">{topic}</p>
            <p className="text-[10px] text-[var(--muted)]">{goal || 'Session in progress'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--primary-light)]">{formatTime(sessionTime)}</span>
          
          {/* Call Buttons */}
          <button
            onClick={() => setCallMode(callMode === 'voice' ? null : 'voice')}
            className={`p-2 rounded-lg text-sm transition-all ${
              callMode === 'voice'
                ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50'
                : 'bg-white/5 hover:bg-white/10 text-[var(--muted)] hover:text-green-400'
            }`}
            title="Voice"
          >
            Voice
          </button>
          <button
            onClick={() => setCallMode(callMode === 'video' ? null : 'video')}
            className={`p-1.5 rounded-lg text-xs transition-all ${
              callMode === 'video'
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                : 'bg-white/5 hover:bg-white/10 text-[var(--muted)] hover:text-blue-400'
            }`}
            title="Video"
          >
            Video
          </button>

          <button onClick={endSession} className="px-3 py-1.5 rounded-lg bg-[var(--error)]/20 text-[var(--error)] text-xs font-medium hover:bg-[var(--error)]/30 transition-all">
            End Session
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Chat Panel */}
        <div className={`${
          callMode ? 'w-1/2 border-r border-[var(--border)]' : 'w-full'
        } overflow-hidden transition-all duration-300`}>
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder={`Ask about ${topic}...`}
          />
        </div>

        {/* Call Panel */}
        {callMode && (
          <div className="w-1/2 overflow-hidden fade-in">
            <CallRoom
              roomName={`session_${topic.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString(36)}`}
              displayName={studentName || 'Student'}
              audioOnly={callMode === 'voice'}
              onLeave={() => setCallMode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
