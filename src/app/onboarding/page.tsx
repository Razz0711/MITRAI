// ============================================
// MitrAI - Onboarding Chat Page
// ============================================

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import ChatInterface from '@/components/ChatInterface';
import { ChatMessage } from '@/lib/types';
import { parseOnboardingData } from '@/lib/onboarding';

const TOTAL_STEPS = 15;

// Map step numbers to field names for data collection
const STEP_FIELDS: Record<number, string> = {
  0: '',       // welcome - no data yet
  1: 'name',
  2: 'age',
  3: 'location',
  4: 'preferredLanguage',
  5: 'currentStudy',
  6: 'targetExam',
  7: 'yearLevel',
  8: 'strongSubjects',
  9: 'weakSubjects',
  10: 'studyMethod',
  11: 'sessionLength',
  12: 'schedule',
  13: 'shortTermGoal',
  14: 'personality',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: "Hey, welcome to MitrAI. I'll help you find your ideal study partner.\n\nLet's start — what's your name?",
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [collectedData, setCollectedData] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);

  const handleSendMessage = useCallback(async (userMessage: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Save the data from current step
    const nextStep = currentStep + 1;
    const fieldName = STEP_FIELDS[currentStep];
    const newData = { ...collectedData };
    if (fieldName && currentStep > 0) {
      newData[fieldName] = userMessage;
    } else if (currentStep === 0) {
      // Step 0 response is the name
      newData['name'] = userMessage;
    }
    setCollectedData(newData);

    try {
      // Build conversation history for Gemini
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      conversationHistory.push({ role: 'user', content: userMessage });

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: nextStep,
          message: userMessage,
          collectedData: newData,
          conversationHistory,
        }),
      });

      const data = await response.json();
      const aiResponse = data.data?.response || 'Sorry, something went wrong. Could you try again?';

      const aiMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setCurrentStep(nextStep);

      // Check if onboarding is complete
      if (nextStep >= TOTAL_STEPS - 1) {
        setIsComplete(true);
        // Create student profile
        await createProfile(newData);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: "Something went wrong on my end. Could you try saying that again?",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [currentStep, collectedData, messages]);

  const createProfile = async (data: Record<string, string>) => {
    try {
      const parsed = parseOnboardingData(data);
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const result = await response.json();
      if (result.success && result.data?.id) {
        // Store the student ID for later use
        localStorage.setItem('mitrai_student_id', result.data.id);
        localStorage.setItem('mitrai_student_name', result.data.name || data.name || '');
      }
    } catch (error) {
      console.error('Profile creation error:', error);
    }
  };

  const progressPercentage = Math.min(100, Math.round((currentStep / (TOTAL_STEPS - 1)) * 100));

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--muted)]">Setting up your profile</span>
          <span className="text-sm font-medium gradient-text">{progressPercentage}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--surface)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder={isComplete ? '' : 'Type your answer...'}
          title="MitrAI Onboarding"
          subtitle="Let's set up your study profile"
        />
      </div>

      {/* Complete Banner */}
      {isComplete && (
        <div className="p-4 border-t border-[var(--border)] fade-in">
          <div className="card p-3 text-center">
            <p className="text-[var(--success)] text-xs font-semibold mb-2">Profile created successfully</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-primary text-xs"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/matches')}
                className="btn-secondary text-xs"
              >
                Find Matches
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
