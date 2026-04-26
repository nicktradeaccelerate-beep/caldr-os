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

export default function PlatformPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<Submission[]>([]);
  const [latestNarrative, setLatestNarrative] = useState<NarrativeLog | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [escResult, subResult, narrativeResult] = await Promise.all([
      supabase.from('escalations').select('id, user_id, summary, created_at, status, users(name)')
        .eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      supabase.from('submissions').select('id, status, submitted_at, users(name), tasks(title, text)')
        .in('status', ['submitted', 'in_review']).order('submitted_at', { ascending: false }).limit(5),
      supabase.from('narrative_logs').select('id, content, generated_at')
        .order('generated_at', { ascending: false }).limit(1).single(),
    ]);
    setEscalations((escResult.data ?? []) as unknown as Escalation[]);
    setPendingSubmissions((subResult.data ?? []) as unknown as Submission[]);
    setLatestNarrative(narrativeResult.data ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', margin: 0, marginBottom: 4 }}>
          Platform
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
          Apprentice management, review queue, cost monitoring, teaching variants.
        </p>
      </div>

      {/* Quick nav */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { href: '/platform/apprentices', label: 'Apprentices', icon: '👥' },
          { href: '/platform/review',      label: 'Review queue', icon: '📋' },
          { href: '/platform/products',    label: 'Products',    icon: '📦' },
          { href: '/platform/costs',       label: 'Costs',       icon: '💷' },
          { href: '/platform/narrative',   label: 'Narrative log', icon: '📖' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', background: 'var(--white)',
            border: '1px solid var(--border)', borderRadius: 10,
            fontSize: 13, fontWeight: 500, color: 'var(--ink)',
            textDecoration: 'none', transition: 'border-color 0.1s',
          }}>
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pending submissions */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Review queue</div>
            <Link href="/platform/review" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {loading ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : pendingSubmissions.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No submissions awaiting review.</div>
          ) : (
            pendingSubmissions.map(sub => (
              <Link key={sub.id} href={`/platform/review/${sub.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                      {sub.tasks?.title ?? sub.tasks?.text ?? 'Task'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                      {sub.users?.name} · {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-GB') : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, background: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    Review
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Escalations */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
            Stuck alerts {escalations.length > 0 && (
              <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, marginLeft: 6 }}>
                {escalations.length}
              </span>
            )}
          </div>
          {loading ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : escalations.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No active escalations.</div>
          ) : (
            escalations.map(esc => (
              <div key={esc.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>
                  {esc.users?.name ?? 'Apprentice'}: {esc.summary.slice(0, 80)}{esc.summary.length > 80 ? '…' : ''}
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

        {/* Latest narrative */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Daily narrative</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <NarrativeGenerateButton onGenerated={(log) => setLatestNarrative(log)} />
              <Link href="/platform/narrative" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                History →
              </Link>
            </div>
          </div>
          {loading ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
          ) : latestNarrative ? (
            <div>
              <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 8 }}>
                Generated {new Date(latestNarrative.generated_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {latestNarrative.content.slice(0, 600)}{latestNarrative.content.length > 600 ? '…' : ''}
              </p>
            </div>
          ) : (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
              No narrative generated yet. Click "Generate" to create today's summary.
            </div>
          )}
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
      fontSize: 10, padding: '2px 8px', background: 'none', border: '1px solid var(--border)',
      borderRadius: 4, cursor: 'pointer', color: 'var(--ink-3)',
    }}>
      {loading ? '…' : 'Seen'}
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
      fontSize: 11, padding: '4px 12px', background: 'var(--accent)', color: 'white',
      border: 'none', borderRadius: 6, cursor: loading ? 'wait' : 'pointer', fontWeight: 600,
    }}>
      {loading ? 'Generating…' : 'Generate'}
    </button>
  );
}
