'use client';

import { useState, useEffect, useRef } from 'react';
import ModelSwitcher, { MODELS } from './ModelSwitcher';
import UsageMeter from './UsageMeter';
import ClippyCharacter from '@/components/clippy/ClippyCharacter';
import type { ModelId } from './ModelSwitcher';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIHubProps {
  userId: string;
  businessId: string;
  initialUsage: Record<ModelId, number>;
}

interface ChatResponse {
  reply: string;
  usage?: Record<ModelId, number>;
  error?: string;
}

const MODEL_PLACEHOLDER: Record<ModelId, string> = {
  claude:  'Ask Claude anything — coaching, copywriting, strategy…',
  gpt:     'Ask ChatGPT — summaries, structured output, quick answers…',
  gemini:  'Ask Gemini — analysis, long documents, research…',
};

const STARTER_PROMPTS: Record<ModelId, string[]> = {
  claude:  ['Write a cold call opening for a boiler service', 'Handle a price objection in 2 sentences', 'Summarise my performance this week'],
  gpt:     ['Turn my call notes into a follow-up email', 'List 5 objection-handling scripts', 'Suggest tasks for this afternoon'],
  gemini:  ['Analyse why Tuesdays have lower conversion', 'Compare morning vs afternoon call sentiment', 'Identify patterns in my missed calls'],
};

export default function AIHub({ userId, businessId, initialUsage }: AIHubProps) {
  const [model, setModel] = useState<ModelId>('claude');
  const [usage, setUsage] = useState<Record<ModelId, number>>(initialUsage);
  // Each model has its own conversation history
  const [conversations, setConversations] = useState<Record<ModelId, Message[]>>({
    claude: [], gpt: [], gemini: [],
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = conversations[model];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const currentModel = MODELS.find(m => m.id === model)!;
    if ((usage[model] ?? 0) >= currentModel.dailyLimit) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: msg };
    setConversations(prev => ({
      ...prev,
      [model]: [...prev[model], userMsg],
    }));
    setLoading(true);

    try {
      const history = conversations[model].slice(-8); // last 8 messages for context
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          message: msg,
          history,
          userId,
          businessId,
        }),
      });
      const data: ChatResponse = await res.json();

      if (data.reply) {
        setConversations(prev => ({
          ...prev,
          [model]: [...prev[model], { role: 'assistant', content: data.reply }],
        }));
      }
      if (data.usage) setUsage(data.usage);
      else {
        // Optimistic local increment
        setUsage(prev => ({ ...prev, [model]: (prev[model] ?? 0) + 1 }));
      }
    } catch {
      setConversations(prev => ({
        ...prev,
        [model]: [...prev[model], { role: 'assistant', content: 'AI unavailable — please try again.' }],
      }));
    }
    setLoading(false);
  }

  function clearConversation() {
    setConversations(prev => ({ ...prev, [model]: [] }));
  }

  const currentModel = MODELS.find(m => m.id === model)!;
  const exhausted = (usage[model] ?? 0) >= currentModel.dailyLimit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      {/* Model switcher */}
      <ModelSwitcher selected={model} usage={usage} onChange={setModel} />

      {/* Usage meter */}
      <UsageMeter usage={usage} selected={model} />

      {/* Chat area */}
      <div style={{
        flex: 1,
        background: 'var(--white)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 380,
      }}>
        {/* Chat header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClippyCharacter
              mood={loading ? 'thinking' : messages.length > 0 ? 'happy' : 'neutral'}
              size={28}
            />
            <div style={{ fontSize: 13, fontWeight: 700, color: currentModel.color }}>
              {currentModel.name} · {currentModel.subLabel}
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearConversation} style={{
              fontSize: 11, color: 'var(--ink-3)', background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: 600,
            }}>
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 4 }}>
                Try asking:
              </div>
              {STARTER_PROMPTS[model].map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  style={{
                    padding: '10px 12px',
                    background: currentModel.bg,
                    border: `1px solid ${currentModel.border}`,
                    borderRadius: 10, fontSize: 13, color: currentModel.color,
                    cursor: 'pointer', textAlign: 'left', fontWeight: 500,
                    fontFamily: 'inherit',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 8,
                  alignItems: 'flex-start',
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: currentModel.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <ClippyCharacter mood="happy" size={18} />
                  </div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '10px 13px',
                  background: msg.role === 'user' ? currentModel.bg : 'var(--card)',
                  border: `1px solid ${msg.role === 'user' ? currentModel.border : 'var(--border)'}`,
                  borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  fontSize: 13,
                  color: 'var(--ink)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: currentModel.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ClippyCharacter mood="thinking" size={18} />
              </div>
              <div style={{
                padding: '12px 16px', background: 'var(--card)',
                borderRadius: '4px 16px 16px 16px', border: '1px solid var(--border)',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: currentModel.color,
                    opacity: 0.6,
                    animation: `bounce 1s ${i * 0.15}s infinite`,
                  }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '12px 14px',
          display: 'flex', gap: 10, alignItems: 'flex-end',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            disabled={exhausted || loading}
            placeholder={exhausted ? `${currentModel.name} limit reached — switch model` : MODEL_PLACEHOLDER[model]}
            rows={1}
            style={{
              flex: 1, padding: '9px 12px',
              background: exhausted ? 'var(--card)' : 'var(--ground)',
              border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 13, color: 'var(--ink)',
              resize: 'none', outline: 'none', fontFamily: 'inherit',
              maxHeight: 140, overflowY: 'auto',
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading || exhausted}
            style={{
              width: 38, height: 38, flexShrink: 0,
              background: !input.trim() || loading || exhausted ? 'var(--border)' : currentModel.color,
              color: !input.trim() || loading || exhausted ? 'var(--ink-3)' : 'white',
              border: 'none', borderRadius: 10, cursor: !input.trim() || loading || exhausted ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}
          >
            ↑
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
