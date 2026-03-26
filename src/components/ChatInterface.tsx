// ============================================
// MitrRAI - Chat Interface Component
// WhatsApp-style: textarea, purple bubbles, smart scroll
// ============================================

'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { ChatMessage } from '@/lib/types';
import { Send } from 'lucide-react';

/* ─── Memoized Bubble ─── */
const ChatBubble = memo(function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className="px-3 py-2 whitespace-pre-wrap"
        style={{
          maxWidth: '75%',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          background: isUser ? 'var(--primary)' : 'var(--surface-light)',
          color: '#fff',
          fontSize: '14px',
          lineHeight: '1.45',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        }}
      >
        {msg.role === 'assistant' && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-[#6d28d9] flex items-center justify-center text-[8px] text-white font-bold">M</div>
            <span className="text-[11px] text-white/60">MitrRAI</span>
          </div>
        )}
        {msg.content}
      </div>
    </div>
  );
});

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  title?: string;
  subtitle?: string;
  quickActions?: React.ReactNode;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  placeholder = 'Type your message...',
  title,
  subtitle,
  quickActions,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '40px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = '40px';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {(title || subtitle) && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
          {subtitle && <p className="text-[10px] text-white/35">{subtitle}</p>}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: 'contain' }}>
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-1">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: 'var(--surface-light)' }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-[#6d28d9] flex items-center justify-center text-[8px] text-white font-bold">M</div>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {quickActions && (
        <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {quickActions}
        </div>
      )}

      {/* Input */}
      <div className="p-3 flex items-end gap-2" style={{ background: 'var(--glass-bg)', borderTop: '1px solid var(--glass-border)' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-none text-[var(--foreground)] text-sm placeholder:text-[var(--muted)] rounded-2xl px-4 py-2.5 outline-none border transition-colors"
          style={{ background: 'var(--surface-light)', borderColor: 'var(--border)', minHeight: '40px', maxHeight: '160px', lineHeight: '1.4' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white transition-all active:scale-90 disabled:opacity-30"
          style={{ background: 'var(--primary)' }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
