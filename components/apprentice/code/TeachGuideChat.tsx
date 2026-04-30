'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CodeBlock {
  lang: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

interface Props {
  mode: 'teach' | 'generate';
  onModeChange: (m: 'teach' | 'generate') => void;
  userId: string | null;
  activeFileName: string;
  activeFileContent: string;
  taskTitle?: string;
  projectName?: string;
  onApplyCode: (code: string) => void;
}

function parseCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      lang: match[1] || 'text',
      code: match[2].trimEnd(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  return blocks;
}

function renderMessage(content: string, onApply: (code: string) => void, isTeach: boolean) {
  const blocks = parseCodeBlocks(content);
  if (blocks.length === 0) {
    return (
      <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {content}
      </p>
    );
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  blocks.forEach((block, i) => {
    if (block.startIndex > cursor) {
      const text = content.slice(cursor, block.startIndex).trim();
      if (text) parts.push(
        <p key={`t${i}`} style={{ margin: '0 0 10px', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</p>
      );
    }
    parts.push(
      <div key={`c${i}`} style={{ marginBottom: 10 }}>
        <div style={{
          background: '#0F172A', borderRadius: 6, overflow: 'hidden',
          border: '1px solid #1E293B',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 10px', borderBottom: '1px solid #1E293B', background: '#1E293B',
          }}>
            <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>{block.lang || 'code'}</span>
            <button
              onClick={() => onApply(block.code)}
              title="Apply this code to the active file"
              style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px',
                background: isTeach ? '#B8941F' : '#1D4ED8',
                color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer',
              }}
            >
              Apply to file
            </button>
          </div>
          <pre style={{
            margin: 0, padding: '10px 12px', fontSize: 12,
            color: '#E2E8F0', overflowX: 'auto', lineHeight: 1.6,
            fontFamily: "'Courier Prime', 'Courier New', monospace",
          }}>
            <code>{block.code}</code>
          </pre>
        </div>
      </div>
    );
    cursor = block.endIndex;
  });
  if (cursor < content.length) {
    const tail = content.slice(cursor).trim();
    if (tail) parts.push(
      <p key="tail" style={{ margin: '10px 0 0', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{tail}</p>
    );
  }
  return <>{parts}</>;
}

export default function TeachGuideChat({
  mode, onModeChange, userId, activeFileName, activeFileContent,
  taskTitle, projectName, onApplyCode,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/apprentice/code-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({
          messages: next,
          mode,
          userId,
          taskTitle,
          projectName,
          fileName: activeFileName,
          fileContent: activeFileContent,
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload) as { text?: string; error?: string };
            if (parsed.text) {
              assistantText += parsed.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantText };
                return updated;
              });
            }
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error — please try again.' }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const isTeach = mode === 'teach';
  const accentColor = isTeach ? '#B8941F' : '#1D4ED8';
  const accentBorder = isTeach ? '2px solid #B8941F' : '2px solid #E2E8F0';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      borderLeft: '1px solid #E2E8F0',
      outline: isTeach ? `2px solid rgba(184,148,31,0.25)` : 'none',
      transition: 'outline 0.2s',
    }}>
      {/* Header with mode toggle */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid #E2E8F0', flexShrink: 0,
        background: isTeach ? 'rgba(184,148,31,0.04)' : 'white',
        transition: 'background 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: isTeach ? '#FEF3C7' : '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>
            {isTeach ? '📖' : '⚡'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
              {isTeach ? 'Teach mode' : 'Generate mode'}
            </div>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>
              {isTeach ? 'Claude asks before it tells' : 'Direct code generation'}
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 2, gap: 2,
        }}>
          {(['teach', 'generate'] as const).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              style={{
                flex: 1, padding: '4px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? (m === 'teach' ? '#B8941F' : '#1D4ED8') : '#64748B',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'teach' ? 'Teach' : 'Generate'}
            </button>
          ))}
        </div>
      </div>

      {/* Message history */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ color: '#94A3B8', fontSize: 12, lineHeight: 1.7, padding: '8px 0' }}>
            {isTeach
              ? 'Ask a question about your code. In Teach mode, Claude will guide you rather than give you answers directly.'
              : 'Describe what you need and Claude will generate it.'
            }
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: msg.role === 'user' ? '#475569' : accentColor,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {msg.role === 'user' ? 'You' : 'Guide'}
            </div>
            <div style={{
              fontSize: 12.5, color: '#1E293B', lineHeight: 1.7,
              background: msg.role === 'user' ? '#F8FAFC' : 'white',
              border: `1px solid ${msg.role === 'user' ? '#E2E8F0' : isTeach ? 'rgba(184,148,31,0.2)' : '#EFF6FF'}`,
              borderRadius: 8, padding: '8px 10px',
            }}>
              {renderMessage(msg.content, onApplyCode, isTeach)}
              {streaming && i === messages.length - 1 && msg.role === 'assistant' && msg.content === '' && (
                <span style={{ color: '#94A3B8' }}>thinking…</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '10px 12px', flexShrink: 0,
        borderTop: accentBorder,
        transition: 'border-top 0.2s',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={isTeach ? 'What are you stuck on?' : 'Describe what you need…'}
            rows={2}
            disabled={streaming}
            style={{
              flex: 1, resize: 'none', border: '1px solid #E2E8F0', borderRadius: 6,
              padding: '7px 10px', fontSize: 12.5, lineHeight: 1.5,
              fontFamily: 'inherit', outline: 'none', color: '#0F172A',
              background: streaming ? '#F8FAFC' : 'white',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            style={{
              padding: '7px 12px', alignSelf: 'flex-end',
              background: streaming || !input.trim() ? '#E2E8F0' : accentColor,
              color: streaming || !input.trim() ? '#94A3B8' : 'white',
              border: 'none', borderRadius: 6, cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            {streaming ? '…' : '→'}
          </button>
        </div>
        <div style={{ marginTop: 5, fontSize: 10, color: '#94A3B8' }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
