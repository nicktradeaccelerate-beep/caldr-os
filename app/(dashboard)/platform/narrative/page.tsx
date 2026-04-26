'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface NarrativeLog {
  id: string;
  content: string;
  generated_at: string;
  period_start: string;
  period_end: string;
}

export default function NarrativePage() {
  const [logs, setLogs] = useState<NarrativeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('narrative_logs')
      .select('id, content, generated_at, period_start, period_end')
      .order('generated_at', { ascending: false })
      .limit(30);
    setLogs((data ?? []) as NarrativeLog[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l =>
    !search || l.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Platform</Link>
          <span style={{ color: 'var(--ink-3)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--ink)' }}>Narrative log</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Daily narrative log</h1>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, width: 180 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            {search ? 'No results for that search.' : 'No narrative logs yet. Generate one from the Platform home page.'}
          </div>
        </div>
      ) : (
        <div>
          {filtered.map(log => (
            <div key={log.id} style={{
              background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)',
              padding: '18px 20px', marginBottom: 10,
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>
                {new Date(log.period_start).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                · Generated {new Date(log.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                {log.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
