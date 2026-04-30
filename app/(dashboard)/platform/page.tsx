'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Escalation {
  id: string;
  user_id: string;
  summary: string;
  created_at: string;
  status: string;
  users?: { name: string } | null;
}

interface Submission {
  id: string;
  status: string;
  submitted_at: string | null;
  users?: { name: string } | null;
  tasks?: { title: string | null; text: string } | null;
}

interface NarrativeLog {
  id: string;
  content: string;
  generated_at: string;
}

const NAV_LINKS = [
  { href: '/platform/apprentices', label: 'Apprentices' },
  { href: '/platform/review',      label: 'Review queue' },
  { href: '/platform/products',    label: 'Products' },
  { href: '/platform/costs',       label: 'Costs' },
  { href: '/platform/narrative',   label: 'Narrative' },
];

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)',
      padding: '16px 20px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ?? 'var(--ink)', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

export default function PlatformPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [latestNarrative, setLatestNarrative] = useState<NarrativeLog | null>(null);
  const [apprenticeCount, setApprenticeCount] = useState(0);
  const [monthSpend, setMonthSpend] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [escResult, subResult, narrativeResult, apprenticeResult, spendResult] = await Promise.all([
      supabase.from('escalations').select('id, user_id, summary, created_at, status, users(name)')
        .eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('submissions').select('id, status, submitted_at, users(name), tasks(title, text)')
        .in('status', ['submitted', 'in_review']).order('submitted_at', { ascending: false }).limit(5),
      supabase.from('narrative_logs').select('id, content, generated_at')
        .order('generated_at', { ascending: false }).limit(1).single(),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'apprentice'),
      supabase.from('api_usage_log').select('api_cost_gbp').gte('created_at', monthStart),
    ]);

    setEscalations((escResult.data ?? []) as unknown as Escalation[]);
    setPendingSubmissions((subResult.data ?? []) as unknown as Submission[]);
    setLatestNarrative(narrativeResult.data ?? null);
    setApprenticeCount(apprenticeResult.count ?? 0);
    const spend = (spendResult.data ?? []).reduce((a: number, r: { api_cost_gbp: number }) => a + Number(r.api_cost_gbp), 0);
    setMonthSpend(spend);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', margin: '0 0 4px' }}>
          Platform
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
          Apprentice management · review queue · cost monitoring · teaching variants
        </p>
      </div>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard
          label="Pending reviews"
          value={loading ? '—' : pendingSubmissions.length}
          sub="awaiting your decision"
          accent={pendingSubmissions.length > 0 ? '#D97706' : undefined}
        />
        <StatCard
          label="Escalation alerts"
          value={loading ? '—' : escalations.length}
          sub="apprentices stuck 30+ min"
          accent={escalations.length > 0 ? '#DC2626' : undefined}
        />
        <StatCard
          label="AI spend this month"
          value={loading ? '—' : `£${monthSpend.toFixed(2)}`}
          sub="across all users"
        />
        <StatCard
          label="Apprentices"
          value={loading ? '—' : apprenticeCount}
          sub="active accounts"
        />
      </div>

      {/* Quick nav */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {NAV_LINKS.map(item => (
          <Link key={item.href} href={item.href} style={{
            padding: '7px 14px',
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12, fontWeight: 500, color: 'var(--ink)',
            textDecoration: 'none',
          }}>
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Review queue */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Review queue
              {pendingSubmissions.length > 0 && (
                <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                  {pendingSubmissions.length}
                </span>
              )}
            </div>
            <Link href="/platform/review" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          <div style={{ padding: '0 18px' }}>
            {loading ? (
              <div style={{ padding: '16px 0', color: 'var(--ink-3)', fontSize: 12 }}>Loading…</div>
            ) : pendingSubmissions.length === 0 ? (
              <div style={{ padding: '20px 0', color: 'var(--ink-3)', fontSize: 12 }}>No submissions awaiting review.</div>
            ) : (
              pendingSubmissions.map(sub => (
                <Link key={sub.id} href={`/platform/review`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>
                        {sub.tasks?.title ?? sub.tasks?.text ?? 'Task'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {sub.users?.name} · {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, background: '#FEF3C7', color: '#92400E', padding: '3px 9px', borderRadius: 6, fontWeight: 600, flexShrink: 0 }}>
                      Review
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Escalations */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Stuck alerts</span>
            {escalations.length > 0 && (
              <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                {escalations.length}
              </span>
            )}
          </div>
          <div style={{ padding: '0 18px' }}>
            {loading ? (
              <div style={{ padding: '16px 0', color: 'var(--ink-3)', fontSize: 12 }}>Loading…</div>
            ) : escalations.length === 0 ? (
              <div style={{ padding: '20px 0', color: 'var(--ink-3)', fontSize: 12 }}>No active escalations.</div>
            ) : (
              escalations.map(esc => (
                <div key={esc.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>
                    <span style={{ color: 'var(--ink-2)' }}>{esc.users?.name ?? 'Apprentice'}:</span>{' '}
                    {esc.summary.slice(0, 80)}{esc.summary.length > 80 ? '…' : ''}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                      {new Date(esc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <EscalationDismiss escalationId={esc.id} onDismissed={() => setEscalations(prev => prev.filter(e => e.id !== esc.id))} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest narrative */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', gridColumn: '1 / -1' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Daily narrative</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <NarrativeGenerateButton onGenerated={(log) => setLatestNarrative(log)} />
              <Link href="/platform/narrative" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                History →
              </Link>
            </div>
          </div>
          <div style={{ padding: '16px 18px' }}>
            {loading ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>Loading…</div>
            ) : latestNarrative ? (
              <>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 10, fontWeight: 500 }}>
                  {new Date(latestNarrative.generated_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {latestNarrative.content.slice(0, 600)}{latestNarrative.content.length > 600 ? '…' : ''}
                </p>
              </>
            ) : (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                No narrative generated yet. Click "Generate" to create today's summary.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EscalationDismiss({ escalationId, onDismissed }: { escalationId: string; onDismissed: () => void }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  async function dismiss() {
    setLoading(true);
    await supabase.from('escalations').update({ status: 'seen' }).eq('id', escalationId);
    setLoading(false);
    onDismissed();
  }
  return (
    <button onClick={dismiss} disabled={loading} style={{
      fontSize: 10, padding: '3px 9px', background: 'none',
      border: '1px solid var(--border)', borderRadius: 5,
      cursor: loading ? 'wait' : 'pointer', color: 'var(--ink-3)', fontFamily: 'inherit',
    }}>
      {loading ? '…' : 'Dismiss'}
    </button>
  );
}

function NarrativeGenerateButton({ onGenerated }: { onGenerated: (log: NarrativeLog) => void }) {
  const [loading, setLoading] = useState(false);
  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/platform/narrative/generate', { method: 'POST' });
      const data = await res.json() as { log?: NarrativeLog };
      if (data.log) onGenerated(data.log);
    } catch { /* silent */ }
    setLoading(false);
  }
  return (
    <button onClick={generate} disabled={loading} style={{
      fontSize: 11, padding: '5px 13px', background: 'var(--accent)', color: 'white',
      border: 'none', borderRadius: 6, cursor: loading ? 'wait' : 'pointer',
      fontWeight: 600, fontFamily: 'inherit',
    }}>
      {loading ? 'Generating…' : 'Generate'}
    </button>
  );
}
