'use client';

import { useState } from 'react';
import type { Call } from '@/types';

interface CallReviewModalProps {
  call: Call;
  businessId: string;
  onClose: () => void;
}

interface ReviewResponse {
  review: string;
  error?: string;
}

const FLAG_COLORS: Record<string, { color: string; bg: string }> = {
  'price objection': { color: '#B45309', bg: 'rgba(245,158,11,0.1)' },
  'low sentiment':   { color: 'var(--rose)', bg: 'var(--rose-light)' },
  'long silence':    { color: '#6D28D9', bg: 'rgba(109,40,217,0.1)' },
  'callback needed': { color: '#1E40AF', bg: 'rgba(30,64,175,0.1)' },
};

function getFlag(flag: string) {
  return FLAG_COLORS[flag.toLowerCase()] ?? { color: 'var(--ink-2)', bg: 'var(--card)' };
}

export default function CallReviewModal({ call, businessId, onClose }: CallReviewModalProps) {
  const [review, setReview] = useState<string | null>(call.coaching_note ?? null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const duration = Math.round(call.duration_seconds / 60);
  const score = call.ai_score;
  const sentiment = call.sentiment_score ?? 0;
  const sentColor = sentiment >= 70 ? '#40916C' : sentiment >= 45 ? '#F59E0B' : '#E11D48';

  async function generateReview() {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/post-call-debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call: {
            contactName: call.contact_name,
            durationMins: duration,
            sentiment,
            flags: call.flags,
          },
          callId: call.id,
          businessId,
        }),
      });
      const data: ReviewResponse = await res.json();
      setReview(data.review ?? null);
    } catch { /* silent */ }
    setLoading(false);
  }

  async function sendToVA() {
    setSending(true);
    try {
      await fetch('/api/boss/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task_complete',
          businessId,
          payload: {
            vaId: call.va_id,
            vaName: 'Your supervisor',
            taskText: `Call review: ${review?.slice(0, 100)}…`,
          },
        }),
      });
      setSent(true);
    } catch { /* silent */ }
    setSending(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(15,14,26,0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 540,
        background: '#1A1733',
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        animation: 'slideUp 0.2s ease-out',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'white', letterSpacing: '-0.2px' }}>
              {call.contact_name ?? call.contact_number}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {call.area ?? 'Unknown area'} · {duration}m · {call.direction}
            </div>
          </div>
          {/* Score ring */}
          {score !== null && (
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: score >= 70 ? 'rgba(64,145,108,0.15)' : score >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(225,29,72,0.15)',
              border: `2px solid ${score >= 70 ? '#40916C' : score >= 50 ? '#F59E0B' : '#E11D48'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: score >= 70 ? '#40916C' : score >= 50 ? '#F59E0B' : '#E11D48', lineHeight: 1 }}>
                {score}
              </div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>/100</div>
            </div>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Sentiment', value: `${sentiment}%`, color: sentColor },
              { label: 'Duration', value: `${duration}m` },
              { label: 'Outcome', value: call.outcome ?? 'N/A' },
            ].map(m => (
              <div key={m.label} style={{ padding: '9px 11px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: m.color ?? 'white' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Flags */}
          {call.flags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {call.flags.map(flag => {
                const { color, bg } = getFlag(flag);
                return (
                  <span key={flag} style={{ padding: '3px 10px', background: bg, color, border: `1px solid ${color}30`, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {flag}
                  </span>
                );
              })}
            </div>
          )}

          {/* AI Coaching debrief */}
          <div style={{ background: 'rgba(27,67,50,0.2)', borderRadius: 12, border: '1px solid rgba(64,145,108,0.2)', padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#40916C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Coaching debrief
            </div>
            {loading ? (
              <div style={{ display: 'flex', gap: 6, padding: '4px 0' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#40916C', animation: `bounce 1s ${i*0.15}s infinite` }}/>)}
              </div>
            ) : review ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{review}</div>
            ) : (
              <button onClick={generateReview} style={{
                padding: '9px 16px', background: 'rgba(64,145,108,0.2)', color: '#40916C',
                border: '1px solid rgba(64,145,108,0.3)', borderRadius: 10,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                Generate debrief with Claude
              </button>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {review && (
              <button onClick={sendToVA} disabled={sending || sent} style={{
                flex: 2, padding: '11px 0',
                background: sent ? 'rgba(64,145,108,0.15)' : 'rgba(64,145,108,0.25)',
                color: sent ? '#40916C' : '#4ADE80',
                border: `1px solid rgba(64,145,108,0.3)`,
                borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: sending || sent ? 'default' : 'pointer',
              }}>
                {sent ? '✓ Sent to VA' : sending ? 'Sending…' : 'Send feedback to VA'}
              </button>
            )}
            <button onClick={onClose} style={{
              flex: 1, padding: '11px 0',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              Close
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>
    </div>
  );
}
