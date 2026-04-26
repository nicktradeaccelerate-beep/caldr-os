'use client';

import { useState, useEffect } from 'react';
import ClippyCharacter from '@/components/clippy/ClippyCharacter';
import type { CompletedCall } from '@/types';

interface PostCallDebriefProps {
  call: CompletedCall;
  callId?: string;
  businessId: string;
  onClose: () => void;
  onNewCall: () => void;
}

const OUTCOME_OPTIONS = [
  { id: 'booked',       label: 'Booked',         color: 'var(--accent)',    bg: 'var(--accent-light)' },
  { id: 'callback',     label: 'Callback',        color: '#B45309',          bg: 'rgba(245,158,11,0.1)' },
  { id: 'not_interested', label: 'Not interested', color: 'var(--rose)',      bg: 'var(--rose-light)' },
  { id: 'voicemail',    label: 'Voicemail',       color: 'var(--ink-2)',     bg: 'var(--card)' },
  { id: 'quote_sent',   label: 'Quote sent',      color: '#1E40AF',          bg: 'rgba(30,64,175,0.1)' },
  { id: 'follow_up',    label: 'Follow up',       color: '#6D28D9',          bg: 'rgba(109,40,217,0.1)' },
] as const;

type OutcomeId = typeof OUTCOME_OPTIONS[number]['id'];

interface DebriefData {
  debrief: string;
}

export default function PostCallDebrief({ call, callId, businessId, onClose, onNewCall }: PostCallDebriefProps) {
  const [debrief, setDebrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [outcome, setOutcome] = useState<OutcomeId | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    fetch('/api/ai/post-call-debrief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call, callId, businessId }),
    })
      .then(r => r.json())
      .then((d: DebriefData) => {
        setDebrief(d.debrief ?? null);
        setLoading(false);
      })
      .catch(() => {
        setDebrief(null);
        setLoading(false);
      });
  }, []);

  // Parse score from debrief text
  const scoreMatch = debrief?.match(/(\d{1,3})\s*\/\s*100/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

  async function saveToLibrary() {
    if (!outcome || saving) return;
    setSaving(true);
    try {
      // 1. Save to Caldr call library
      await fetch(`/api/calls/${callId ?? 'new'}/outcome`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, note, coachingNote: debrief }),
      });

      // 2. Write outcome back to BFB CRM if we have a lead ID
      if (call.leadId) {
        const statusMap: Record<string, string> = {
          booked:         'customer',
          quote_sent:     'quoted',
          callback:       'lead',
          follow_up:      'lead',
          not_interested: 'lost',
          voicemail:      'lead',
        };
        await fetch('/api/bfb/update-lead', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId:    call.leadId,
            businessId,
            status:    statusMap[outcome] ?? 'lead',
            notes:     note || undefined,
            lastContact: new Date().toISOString().split('T')[0],
          }),
        });
      }

      setSaved(true);
    } catch {
      // Fail silently — outcome still visible locally
    }
    setSaving(false);
  }

  const durationMins = call.durationMins;
  const durationStr = durationMins >= 1
    ? `${Math.floor(durationMins)}m ${Math.round((durationMins % 1) * 60)}s`
    : `${Math.round(durationMins * 60)}s`;

  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: 18,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <ClippyCharacter mood="happy" size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.2px' }}>
            Call complete
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
            {call.contactName ?? 'Unknown'} · {durationStr} · Sentiment {call.sentiment}%
          </div>
        </div>
        {score !== null && (
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: score >= 70 ? 'var(--accent-light)' : score >= 50 ? 'rgba(245,158,11,0.1)' : 'var(--rose-light)',
            border: `2px solid ${score >= 70 ? 'var(--accent-mid)' : score >= 50 ? '#F59E0B' : 'var(--rose-mid)'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: score >= 70 ? 'var(--accent)' : score >= 50 ? '#B45309' : 'var(--rose)', lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 600 }}>/100</div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Flags */}
        {call.flags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {call.flags.map(flag => (
              <span key={flag} style={{
                padding: '3px 10px',
                background: 'rgba(225,29,72,0.08)',
                color: 'var(--rose)',
                border: '1px solid rgba(225,29,72,0.15)',
                borderRadius: 20, fontSize: 11, fontWeight: 600,
              }}>
                {flag}
              </span>
            ))}
          </div>
        )}

        {/* AI Debrief */}
        <div style={{
          padding: '12px 14px',
          background: 'var(--accent-pale)',
          borderRadius: 12,
          border: '1px solid var(--accent-light)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Coaching debrief
          </div>
          {loading ? (
            <div style={{ display: 'flex', gap: 6 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent-mid)',
                  animation: `bounce 1s ${i * 0.15}s infinite`,
                }}/>
              ))}
            </div>
          ) : debrief ? (
            <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {debrief}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>No debrief available.</div>
          )}
        </div>

        {/* Outcome selector */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Log outcome</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {OUTCOME_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setOutcome(opt.id)}
                style={{
                  padding: '7px 12px',
                  background: outcome === opt.id ? opt.bg : 'var(--card)',
                  color: outcome === opt.id ? opt.color : 'var(--ink-2)',
                  border: `1px solid ${outcome === opt.id ? 'currentColor' : 'var(--border)'}`,
                  borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)…"
            rows={2}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 13, color: 'var(--ink)',
              resize: 'none', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={saveToLibrary}
            disabled={!outcome || saving || saved}
            style={{
              flex: 2, padding: '11px 0',
              background: saved ? 'var(--accent-light)' : !outcome ? 'var(--border)' : 'var(--accent)',
              color: saved ? 'var(--accent)' : !outcome ? 'var(--ink-3)' : 'white',
              border: 'none', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: !outcome || saving || saved ? 'default' : 'pointer',
            }}
          >
            {saved ? '✓ Saved to library' : saving ? 'Saving…' : 'Save to call library'}
          </button>
          <button
            onClick={onNewCall}
            style={{
              flex: 1, padding: '11px 0',
              background: 'var(--accent)',
              color: 'white',
              border: 'none', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            New call
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px 0',
              background: 'var(--card)',
              color: 'var(--ink-2)',
              border: '1px solid var(--border)', borderRadius: 12,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
