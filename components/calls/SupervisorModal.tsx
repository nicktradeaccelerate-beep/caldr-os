'use client';

import { useState, useEffect } from 'react';
import ClippyCharacter from '@/components/clippy/ClippyCharacter';
import type { SupervisorMode, ActiveCall } from '@/types';

interface SupervisorModalProps {
  call: ActiveCall;
  supervisorNumber: string;
  businessId: string;
  onClose: () => void;
}

interface BriefData {
  reply: string;
}

const MODE_CONFIG: Record<SupervisorMode, { label: string; desc: string; color: string; bg: string }> = {
  listen:  { label: 'Listen',  desc: 'Silent observation — VA cannot hear you', color: 'var(--accent)',    bg: 'var(--accent-light)' },
  whisper: { label: 'Whisper', desc: 'Coach the VA live — contact cannot hear you', color: '#B45309',       bg: 'rgba(245,158,11,0.1)' },
  barge:   { label: 'Barge',   desc: 'Join the call — everyone hears you',        color: 'var(--rose)',     bg: 'var(--rose-light)' },
};

export default function SupervisorModal({ call, supervisorNumber, businessId, onClose }: SupervisorModalProps) {
  const [mode, setMode] = useState<SupervisorMode>('listen');
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [whisperText, setWhisperText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Auto-load AI suggestion when modal opens
  useEffect(() => {
    loadAISuggestion();
  }, []);

  // Reload suggestion when mode changes (for context-aware whisper suggestions)
  useEffect(() => {
    if (mode === 'whisper') loadAISuggestion();
  }, [mode]);

  async function loadAISuggestion() {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/clippy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Supervisor brief needed. VA ${call.vaName} is on a call with ${call.contactName ?? 'unknown contact'} from ${call.area ?? 'unknown area'}. Duration: ${call.durationMins}m. Sentiment: ${call.sentiment}%. Intent: ${call.intent ?? 'unknown'}. Mode: ${mode}. Give a brief situation read, suggested whisper line, and one risk flag.`,
          context: { currentTask: 'Supervisor monitoring', aiUsage: { claude: 0, gpt: 0, gemini: 0 } },
          businessId,
        }),
      });
      const d: BriefData = await res.json();
      setAiSuggestion(d.reply ?? null);
    } catch {
      setAiSuggestion(null);
    }
    setAiLoading(false);
  }

  async function join() {
    setJoining(true);
    try {
      await fetch('/api/twilio/conference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          callSid: call.callSid,
          supervisorNumber,
          mode,
        }),
      });
      setJoined(true);
    } catch {
      // Surface error in production
    }
    setJoining(false);
  }

  async function switchMode(newMode: SupervisorMode) {
    setMode(newMode);
    if (!joined) return;
    const action = newMode === 'barge' ? 'barge' : newMode === 'whisper' ? 'whisper' : 'join';
    await fetch('/api/twilio/conference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, callSid: call.callSid }),
    });
  }

  async function leave() {
    await fetch('/api/twilio/conference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave', callSid: call.callSid }),
    });
    setJoined(false);
  }

  const durationStr = `${call.durationMins}m`;
  const sentimentColor = call.sentiment >= 70 ? 'var(--accent-mid)' : call.sentiment >= 45 ? '#F59E0B' : 'var(--rose)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(26,25,24,0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--white)',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        animation: 'slideUp 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: joined ? '#4ADE80' : 'var(--border)',
            boxShadow: joined ? '0 0 0 3px rgba(74,222,128,0.25)' : 'none',
            flexShrink: 0,
          }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.2px' }}>
              Supervisor — {call.vaName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
              {call.contactName ?? 'Unknown contact'} · {call.area} · {durationStr} · <span style={{ color: sentimentColor, fontWeight: 600 }}>{call.sentiment}%</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Mode selector */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Monitor mode</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(Object.keys(MODE_CONFIG) as SupervisorMode[]).map(m => {
                const cfg = MODE_CONFIG[m];
                const active = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    style={{
                      flex: 1, padding: '9px 0',
                      background: active ? cfg.bg : 'var(--card)',
                      color: active ? cfg.color : 'var(--ink-2)',
                      border: `1px solid ${active ? 'currentColor' : 'var(--border)'}`,
                      borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-2)' }}>
              {MODE_CONFIG[mode].desc}
            </div>
          </div>

          {/* AI supervisor brief */}
          <div style={{
            padding: '12px 14px',
            background: 'var(--accent-pale)',
            borderRadius: 12, border: '1px solid var(--accent-light)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ClippyCharacter mood={aiLoading ? 'thinking' : 'neutral'} size={24} />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live read</div>
            </div>
            {aiLoading ? (
              <div style={{ display: 'flex', gap: 6 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--accent-mid)',
                    animation: `bounce 1s ${i * 0.15}s infinite`,
                  }}/>
                ))}
              </div>
            ) : aiSuggestion ? (
              <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {aiSuggestion}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>No suggestion available.</div>
            )}
          </div>

          {/* Whisper pad — only shown in whisper mode */}
          {mode === 'whisper' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Whisper pad</div>
              <textarea
                value={whisperText}
                onChange={e => setWhisperText(e.target.value)}
                placeholder="Type what you want to say to the VA…"
                rows={3}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'rgba(245,158,11,0.05)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 10, fontSize: 13, color: 'var(--ink)',
                  resize: 'none', outline: 'none', fontFamily: 'inherit',
                }}
              />
              {aiSuggestion && (
                <button
                  onClick={() => setWhisperText(
                    aiSuggestion.match(/[""](.*?)[""]/)?.[1] ??
                    aiSuggestion.split('\n').find(l => l.includes('whisper') || l.includes('say')) ??
                    ''
                  )}
                  style={{
                    marginTop: 6, padding: '5px 12px',
                    background: 'rgba(245,158,11,0.1)', color: '#B45309',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Use AI suggestion
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            {!joined ? (
              <button
                onClick={join}
                disabled={joining}
                style={{
                  flex: 2, padding: '12px 0',
                  background: joining ? 'var(--border)' : MODE_CONFIG[mode].bg,
                  color: joining ? 'var(--ink-3)' : MODE_CONFIG[mode].color,
                  border: `1px solid ${joining ? 'var(--border)' : 'currentColor'}`,
                  borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: joining ? 'default' : 'pointer',
                }}
              >
                {joining ? 'Connecting…' : `Join as ${MODE_CONFIG[mode].label}`}
              </button>
            ) : (
              <button
                onClick={leave}
                style={{
                  flex: 2, padding: '12px 0',
                  background: 'var(--rose-light)', color: 'var(--rose)',
                  border: '1px solid rgba(225,29,72,0.2)',
                  borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Leave call
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '12px 0',
                background: 'var(--card)', color: 'var(--ink-2)',
                border: '1px solid var(--border)',
                borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
