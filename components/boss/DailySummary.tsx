'use client';

import { useState } from 'react';
import ClippyCharacter from '@/components/clippy/ClippyCharacter';

interface DailySummaryProps {
  vaId: string;
  vaName: string;
  businessId: string;
}

interface SummaryStats {
  totalCalls: number;
  totalTalkMins: number;
  avgSentiment: number;
  tasksCompleted: number;
  totalHearts: number;
}

interface SummaryResponse {
  summary: string;
  stats: SummaryStats;
}

export default function DailySummary({ vaId, vaName, businessId }: DailySummaryProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummaryResponse | null>(null);
  const [sent, setSent] = useState(false);

  async function generateSummary() {
    setLoading(true);
    setSent(false);
    try {
      const res = await fetch('/api/boss/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaId, vaName, businessId }),
      });
      const data: SummaryResponse = await res.json();
      setResult(data);
      setSent(true);
    } catch { /* silent */ }
    setLoading(false);
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ClippyCharacter mood={loading ? 'thinking' : sent ? 'celebrating' : 'neutral'} size={36} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Daily Summary</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{today}</div>
        </div>
      </div>

      {result ? (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Calls made', value: String(result.stats.totalCalls) },
              { label: 'Talk time', value: `${result.stats.totalTalkMins}m` },
              { label: 'Avg sentiment', value: `${result.stats.avgSentiment}%` },
              { label: 'Tasks done', value: String(result.stats.tasksCompleted) },
              { label: 'Hearts earned', value: `${result.stats.totalHearts} ♥` },
            ].map(s => (
              <div key={s.label} style={{
                padding: '10px 12px',
                background: 'var(--card)',
                borderRadius: 10, border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.3px' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* AI narrative */}
          <div style={{
            padding: '12px 14px',
            background: 'var(--accent-pale)',
            borderRadius: 12, border: '1px solid var(--accent-light)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>AI summary</div>
            <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7 }}>
              {result.summary}
            </div>
          </div>

          {sent && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--accent-mid)' }}>
              <span>✓</span>
              <span>Summary sent via WhatsApp &amp; email</span>
            </div>
          )}

          <button onClick={generateSummary} style={{
            padding: '10px 0', background: 'var(--card)', color: 'var(--ink-2)',
            border: '1px solid var(--border)', borderRadius: 12,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Regenerate &amp; resend
          </button>
        </>
      ) : (
        <div style={{
          padding: 24, background: 'var(--card)', borderRadius: 12,
          border: '1px solid var(--border)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
            Generate a daily summary to send to your boss via WhatsApp and email.
          </div>
          <button
            onClick={generateSummary}
            disabled={loading}
            style={{
              padding: '11px 24px',
              background: loading ? 'var(--border)' : 'var(--accent)',
              color: loading ? 'var(--ink-3)' : 'white',
              border: 'none', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Generating…' : 'Generate & send summary'}
          </button>
        </div>
      )}
    </div>
  );
}
