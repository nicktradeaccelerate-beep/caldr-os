'use client';

import { useState, useRef, useEffect } from 'react';
import ClippyCharacter from '@/components/clippy/ClippyCharacter';

interface CodeFile {
  name: string;
  language: string;
  content: string;
}

interface CodeEnvProps {
  userId: string;
  businessId: string;
}

interface ReviewResponse {
  review: string;
  error?: string;
}

const STARTER_FILES: CodeFile[] = [
  {
    name: 'call_script.md',
    language: 'markdown',
    content: `# Cold Call Script — Boiler Service

## Opening
"Hi [Name], this is [VA] calling from [Company]. I'm not sure if you've heard of us — we're the team that completed a boiler service on [Street] last month?"

## Qualification
- Are you the homeowner?
- When was the boiler last serviced?
- Any concerns with it at the moment?

## Pitch
"We're currently offering a [service] in your area this [week/month]..."

## Objections
- **Too expensive**: "Completely understand — can I ask what you're currently paying?"
- **Happy with current supplier**: "That's great — who are you with? We often work alongside..."
- **Call back later**: "Of course — is morning or afternoon better?"
`,
  },
  {
    name: 'follow_up.md',
    language: 'markdown',
    content: `# Follow-up Email Template

Subject: [First name] — following up on our conversation

Hi [First name],

Thank you for taking the time to speak with me earlier.

As discussed, I'm attaching [information/quote] for [service].

**Next step:** [specific action + timeframe]

Please don't hesitate to call me directly on [number] if you have any questions.

Best,
[Your name]
[Company]
`,
  },
  {
    name: 'notes.txt',
    language: 'text',
    content: `Call notes — [Date]

Contact:
Number:
Area:
Duration:

Summary:


Objections raised:


Agreed next step:


Follow-up date:
`,
  },
];

// Simple syntax highlighting — enough for the VA use case (markdown, text, JSON)
function highlight(code: string, lang: string): string {
  if (lang === 'markdown') {
    return code
      .replace(/^(#{1,6} .+)$/gm, '<span style="color:#1B4332;font-weight:700">$1</span>')
      .replace(/\*\*(.+?)\*\*/g, '<span style="color:#1B4332;font-weight:600">$1</span>')
      .replace(/`(.+?)`/g, '<span style="color:#C96442;font-family:DM Mono,monospace">$1</span>')
      .replace(/^(- .+)$/gm, '<span style="color:#40916C">$1</span>');
  }
  return code;
}

const TERM_PROMPT = '$ ';

export default function CodeEnv({ userId, businessId }: CodeEnvProps) {
  const [files, setFiles] = useState<CodeFile[]>(STARTER_FILES);
  const [activeFile, setActiveFile] = useState(0);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'ai' | 'terminal'>('editor');
  const [termHistory, setTermHistory] = useState<string[]>(['Caldr Code Environment v1.0', 'Type "help" for commands.', '']);
  const [termInput, setTermInput] = useState('');
  const [review, setReview] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [addingFile, setAddingFile] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const file = files[activeFile];

  useEffect(() => {
    termRef.current?.scrollTo(0, termRef.current.scrollHeight);
  }, [termHistory]);

  function handleEditorChange(val: string) {
    setFiles(prev => prev.map((f, i) => i === activeFile ? { ...f, content: val } : f));
  }

  // Tab key inserts spaces instead of tabbing away
  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = file.content;
      handleEditorChange(val.slice(0, start) + '  ' + val.slice(end));
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  }

  function handleTerminalSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cmd = termInput.trim();
    setTermInput('');
    const output = runCommand(cmd);
    setTermHistory(prev => [...prev, `${TERM_PROMPT}${cmd}`, ...output, '']);
  }

  function runCommand(cmd: string): string[] {
    if (!cmd) return [];
    switch (cmd.split(' ')[0]) {
      case 'help':
        return ['Available commands:', '  ls       — list files', '  cat [file] — show file content', '  clear    — clear terminal', '  wc [file] — word count', '  echo [text] — print text'];
      case 'ls':
        return files.map(f => f.name);
      case 'cat': {
        const name = cmd.split(' ')[1];
        const f = files.find(f => f.name === name);
        return f ? f.content.split('\n') : [`cat: ${name}: No such file`];
      }
      case 'wc': {
        const name = cmd.split(' ')[1];
        const f = files.find(f => f.name === name);
        if (!f) return [`wc: ${name}: No such file`];
        const words = f.content.split(/\s+/).filter(Boolean).length;
        const lines = f.content.split('\n').length;
        return [`${lines} lines, ${words} words — ${name}`];
      }
      case 'clear':
        setTermHistory([]);
        return [];
      case 'echo':
        return [cmd.slice(5)];
      default:
        return [`${cmd}: command not found`];
    }
  }

  async function requestReview() {
    setReviewLoading(true);
    setReview(null);
    try {
      const res = await fetch('/api/ai/code-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: file.content, filename: file.name, userId, businessId }),
      });
      const data: ReviewResponse = await res.json();
      setReview(data.review ?? data.error ?? 'No review returned.');
    } catch {
      setReview('AI unavailable. Please try again.');
    }
    setReviewLoading(false);
  }

  function addFile() {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    const ext = name.split('.').pop() ?? 'txt';
    const language = ext === 'md' ? 'markdown' : ext === 'json' ? 'json' : 'text';
    setFiles(prev => [...prev, { name, language, content: '' }]);
    setActiveFile(files.length);
    setNewFileName('');
    setAddingFile(false);
  }

  const EDITOR_TABS = [
    { id: 'editor',   label: 'Editor' },
    { id: 'preview',  label: 'Preview' },
    { id: 'ai',       label: 'AI Assist' },
    { id: 'terminal', label: 'Terminal' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* File tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'var(--card)', borderRadius: '12px 12px 0 0',
        borderBottom: '1px solid var(--border)', padding: '6px 6px 0',
        overflowX: 'auto',
      }}>
        {files.map((f, i) => (
          <button
            key={f.name}
            onClick={() => { setActiveFile(i); setReview(null); }}
            style={{
              padding: '6px 12px',
              background: activeFile === i ? 'var(--white)' : 'transparent',
              border: `1px solid ${activeFile === i ? 'var(--border)' : 'transparent'}`,
              borderBottom: activeFile === i ? '1px solid var(--white)' : '1px solid transparent',
              borderRadius: '8px 8px 0 0',
              fontSize: 12, fontWeight: activeFile === i ? 600 : 400,
              color: activeFile === i ? 'var(--ink)' : 'var(--ink-2)',
              cursor: 'pointer', whiteSpace: 'nowrap',
              marginBottom: -1,
            }}
          >
            {f.name}
          </button>
        ))}
        {addingFile ? (
          <form onSubmit={e => { e.preventDefault(); addFile(); }} style={{ display: 'flex', gap: 4, padding: '0 4px' }}>
            <input
              autoFocus
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              placeholder="filename.md"
              onBlur={() => { if (!newFileName) setAddingFile(false); }}
              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, width: 110, outline: 'none' }}
            />
            <button type="submit" style={{ padding: '4px 8px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>+</button>
          </form>
        ) : (
          <button onClick={() => setAddingFile(true)} style={{
            padding: '6px 10px', background: 'none', border: 'none',
            fontSize: 16, color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1,
          }}>+</button>
        )}
      </div>

      {/* View tabs */}
      <div style={{
        display: 'flex', background: 'var(--white)',
        borderBottom: '1px solid var(--border)', padding: '0 4px',
      }}>
        {EDITOR_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '7px 14px', background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === t.id ? 'var(--accent)' : 'transparent'}`,
              color: activeTab === t.id ? 'var(--accent)' : 'var(--ink-2)',
              fontSize: 12, fontWeight: activeTab === t.id ? 600 : 400, cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      {activeTab === 'editor' && (
        <div style={{ flex: 1, display: 'flex', minHeight: 400 }}>
          {/* Line numbers */}
          <div style={{
            padding: '12px 8px', background: 'var(--card)',
            borderRight: '1px solid var(--border)',
            color: 'var(--ink-3)', fontSize: 12, fontFamily: 'DM Mono, monospace',
            lineHeight: 1.6, textAlign: 'right', userSelect: 'none', minWidth: 36,
          }}>
            {file.content.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={editorRef}
            value={file.content}
            onChange={e => handleEditorChange(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            spellCheck={false}
            style={{
              flex: 1, padding: '12px 14px',
              background: 'var(--white)', border: 'none', resize: 'none', outline: 'none',
              fontSize: 13, fontFamily: 'DM Mono, monospace', lineHeight: 1.6,
              color: 'var(--ink)',
            }}
          />
        </div>
      )}

      {/* Preview */}
      {activeTab === 'preview' && (
        <div
          style={{
            flex: 1, padding: '16px 20px',
            background: 'var(--white)', overflowY: 'auto',
            fontSize: 14, lineHeight: 1.8, color: 'var(--ink)',
          }}
          dangerouslySetInnerHTML={{ __html: highlight(file.content, file.language) }}
        />
      )}

      {/* AI Assist */}
      {activeTab === 'ai' && (
        <div style={{ flex: 1, padding: 16, background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClippyCharacter mood={reviewLoading ? 'thinking' : review ? 'happy' : 'neutral'} size={36} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Claude Code Review</div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{file.name}</div>
            </div>
          </div>

          {!review && !reviewLoading && (
            <div style={{ padding: 20, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 14 }}>
                Claude will review your current file for structure, clarity, and improvements.
              </div>
              <button
                onClick={requestReview}
                style={{
                  padding: '10px 24px',
                  background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 12,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Review with Claude
              </button>
            </div>
          )}

          {reviewLoading && (
            <div style={{ padding: 20, background: 'var(--accent-pale)', borderRadius: 12, border: '1px solid var(--accent-light)', display: 'flex', gap: 8, alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-mid)', animation: `bounce 1s ${i*0.15}s infinite` }}/>
              ))}
              <span style={{ fontSize: 13, color: 'var(--accent)' }}>Claude is reviewing…</span>
            </div>
          )}

          {review && (
            <>
              <div style={{
                padding: '14px 16px', background: 'var(--accent-pale)',
                borderRadius: 12, border: '1px solid var(--accent-light)',
                fontSize: 13, color: 'var(--ink)', lineHeight: 1.8, whiteSpace: 'pre-wrap',
              }}>
                {review}
              </div>
              <button
                onClick={requestReview}
                style={{
                  padding: '9px 0', background: 'var(--card)', color: 'var(--ink-2)',
                  border: '1px solid var(--border)', borderRadius: 10,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Re-review
              </button>
            </>
          )}
        </div>
      )}

      {/* Terminal */}
      {activeTab === 'terminal' && (
        <div style={{ flex: 1, background: '#1A1918', display: 'flex', flexDirection: 'column', minHeight: 300 }}>
          <div
            ref={termRef}
            style={{
              flex: 1, padding: '12px 14px', overflowY: 'auto',
              fontFamily: 'DM Mono, monospace', fontSize: 12, lineHeight: 1.7,
              color: '#E8E6DF',
            }}
          >
            {termHistory.map((line, i) => (
              <div key={i} style={{ color: line.startsWith('$') ? '#4ADE80' : line.startsWith('Available') || line.startsWith('  ') ? '#A8A69E' : '#E8E6DF' }}>
                {line || '\u00A0'}
              </div>
            ))}
          </div>
          <form onSubmit={handleTerminalSubmit} style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 14px', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#4ADE80', flexShrink: 0 }}>$</span>
            <input
              autoFocus
              value={termInput}
              onChange={e => setTermInput(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E6DF',
              }}
            />
          </form>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
