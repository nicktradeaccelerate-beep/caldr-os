'use client';

import { useState, useEffect, useRef } from 'react';
import ClippyCharacter from '@/components/clippy/ClippyCharacter';

interface LiveCallPanelProps {
  contactName?: string | null;
  contactNumber: string;
  area?: string | null;
  callSid: string;
  businessId: string;
  onHangUp: (durationSeconds: number) => void;
}

interface CoachReply {
  reply: string;
}

const OBJECTION_HANDLES: Record<string, string> = {
  'too expensive': "I completely understand — a lot of our clients said the same before they saw the saving on their next bill. Would it help if I walked you through exactly what's included?",
  'not interested': "Totally fair. Can I ask — is it the timing, or is there something specific that doesn't feel like a fit right now?",
  'already have someone': "Great, means you know the value. We often work alongside existing providers — what would make you consider switching or adding coverage?",
  'call me back': "Of course. Is morning or afternoon better for you? I'll block it right now.",
  'send me info': "I'll fire that over in the next few minutes. While I have you — is there one thing you'd most want to understand before reading it?",
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Simulated sentiment drift — in production, fed from Twilio Intelligence / streaming
function simulateSentiment(seconds: number): number {
  const base = 72;
  const drift = Math.sin(seconds / 30) * 8;
  return Math.max(20, Math.min(98, Math.round(base + drift)));
}

export default function LiveCallPanel({
  contactName, contactNumber, area, callSid, businessId, onHangUp,
}: LiveCallPanelProps) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [sentiment, setSentiment] = useState(72);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        const next = s + 1;
        setSentiment(simulateSentiment(next));
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  async function askAI() {
    if (!aiQuestion.trim() || aiLoading) return;
    setAiLoading(true);
    setAiReply(null);
    try {
      const res = await fetch('/api/ai/clippy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Live call with ${contactName ?? contactNumber} from ${area ?? 'unknown area'}. ${Math.floor(seconds / 60)} minutes in, sentiment ${sentiment}%. Question: ${aiQuestion}`,
          context: { currentTask: 'Live call', aiUsage: { claude: 0, gpt: 0, gemini: 0 } },
          businessId,
        }),
      });
      const d: CoachReply = await res.json();
      setAiReply(d.reply ?? null);
    } catch {
      setAiReply('AI unavailable — trust your instincts.');
    }
    setAiLoading(false);
  }

  function handleHangUp() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    onHangUp(seconds);
  }

  const sentimentColor = sentiment >= 70 ? 'var(--accent-mid)' : sentiment >= 45 ? '#F59E0B' : 'var(--rose)';
  const sentimentLabel = sentiment >= 70 ? 'Positive' : sentiment >= 45 ? 'Neutral' : 'At risk';

  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: 18,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Header strip — active call */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--accent)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#4ADE80',
          boxShadow: '0 0 0 3px rgba(74,222,128,0.3)',
          animation: 'pulse 2s infinite',
          flexShrink: 0,
        }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contactName ?? contactNumber}
          </div>
          {area && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{area}</div>}
        </div>
        <div style={{ fontSize: 28, fontWeight: 200, color: 'white', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em' }}>
          {fmt(seconds)}
        </div>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Sentiment */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Sentiment</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: sentimentColor }}>{sentiment}% — {sentimentLabel}</div>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${sentiment}%`,
              background: sentimentColor,
              borderRadius: 3,
              transition: 'width 1s ease, background 1s ease',
            }}/>
          </div>
        </div>

        {/* Call controls */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setMuted(m => !m)}
            style={{
              flex: 1, padding: '10px 0',
              background: muted ? 'var(--rose-light)' : 'var(--card)',
              color: muted ? 'var(--rose)' : 'var(--ink-2)',
              border: `1px solid ${muted ? 'rgba(225,29,72,0.2)' : 'var(--border)'}`,
              borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {muted ? '🔇 Unmute' : '🎤 Mute'}
          </button>
          <button
            onClick={() => setOnHold(h => !h)}
            style={{
              flex: 1, padding: '10px 0',
              background: onHold ? 'rgba(245,158,11,0.1)' : 'var(--card)',
              color: onHold ? '#B45309' : 'var(--ink-2)',
              border: `1px solid ${onHold ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
              borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {onHold ? '▶ Resume' : '⏸ Hold'}
          </button>
          <button
            onClick={handleHangUp}
            style={{
              flex: 1, padding: '10px 0',
              background: 'var(--rose)',
              color: 'white',
              border: 'none',
              borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            End
          </button>
        </div>

        {/* Objection handles */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Quick objection handles</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.keys(OBJECTION_HANDLES).map(key => (
              <button
                key={key}
                onClick={() => setActiveHandle(activeHandle === key ? null : key)}
                style={{
                  padding: '5px 10px',
                  background: activeHandle === key ? 'var(--accent-light)' : 'var(--card)',
                  color: activeHandle === key ? 'var(--accent)' : 'var(--ink-2)',
                  border: `1px solid ${activeHandle === key ? 'var(--accent-light)' : 'var(--border)'}`,
                  borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {key}
              </button>
            ))}
          </div>
          {activeHandle && (
            <div style={{
              marginTop: 8, padding: '10px 12px',
              background: 'var(--accent-pale)',
              borderRadius: 10, border: '1px solid var(--accent-light)',
              fontSize: 13, color: 'var(--ink)', lineHeight: 1.6,
              fontStyle: 'italic',
            }}>
              &ldquo;{OBJECTION_HANDLES[activeHandle]}&rdquo;
            </div>
          )}
        </div>

        {/* AI ask box */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ClippyCharacter mood={aiLoading ? 'thinking' : aiReply ? 'happy' : 'neutral'} size={24} />
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ask Clippy (live)</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askAI()}
              placeholder="How do I handle price pushback?"
              style={{
                flex: 1, padding: '9px 12px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10, fontSize: 13, color: 'var(--ink)',
                outline: 'none',
              }}
            />
            <button
              onClick={askAI}
              disabled={aiLoading || !aiQuestion.trim()}
              style={{
                padding: '9px 14px',
                background: aiLoading || !aiQuestion.trim() ? 'var(--border)' : 'var(--accent)',
                color: aiLoading || !aiQuestion.trim() ? 'var(--ink-3)' : 'white',
                border: 'none', borderRadius: 10,
                fontSize: 12, fontWeight: 600, cursor: aiLoading || !aiQuestion.trim() ? 'default' : 'pointer',
              }}
            >
              {aiLoading ? '…' : 'Ask'}
            </button>
          </div>
          {aiReply && (
            <div style={{
              marginTop: 8, padding: '10px 12px',
              background: 'var(--accent-pale)',
              borderRadius: 10, border: '1px solid var(--accent-light)',
              fontSize: 13, color: 'var(--ink)', lineHeight: 1.6,
            }}>
              {aiReply}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(74,222,128,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(74,222,128,0.1); }
        }
      `}</style>
    </div>
  );
}
