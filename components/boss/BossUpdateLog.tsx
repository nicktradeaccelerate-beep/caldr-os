'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { BossUpdate } from '@/types';

interface BossUpdateLogProps {
  businessId: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  task_start:    { icon: '⏱', color: 'var(--ink-2)',    bg: 'var(--card)' },
  task_complete: { icon: '✅', color: 'var(--accent)',   bg: 'var(--accent-pale)' },
  working:       { icon: '🔄', color: '#B45309',         bg: 'rgba(245,158,11,0.08)' },
  daily_summary: { icon: '📊', color: '#1E40AF',         bg: 'rgba(30,64,175,0.08)' },
};

interface UpdatesResponse {
  updates: BossUpdate[];
}

export default function BossUpdateLog({ businessId }: BossUpdateLogProps) {
  const [updates, setUpdates] = useState<BossUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchUpdates = useCallback(async (since?: string) => {
    try {
      const url = since
        ? `/api/boss/updates?businessId=${businessId}&since=${encodeURIComponent(since)}`
        : `/api/boss/updates?businessId=${businessId}&limit=50`;
      const res = await fetch(url);
      const data: UpdatesResponse = await res.json();
      const fresh = data.updates ?? [];
      if (fresh.length > 0) {
        setUpdates(prev => since
          ? [...fresh.reverse(), ...prev].slice(0, 200)
          : fresh.reverse()
        );
        setLastFetched(fresh[fresh.length - 1]?.created_at ?? null);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchUpdates();
    pollRef.current = setInterval(() => fetchUpdates(lastFetched ?? undefined), 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchUpdates, lastFetched]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [updates]);

  async function clearLog() {
    await fetch('/api/boss/updates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    });
    setUpdates([]);
  }

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Loading updates…</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {updates.length} update{updates.length !== 1 ? 's' : ''} today
        </div>
        {updates.length > 0 && (
          <button onClick={clearLog} style={{
            fontSize: 11, color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
        {updates.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            No updates yet today. Updates appear here as your VA works.
          </div>
        ) : (
          updates.map((update, i) => {
            const cfg = TYPE_CONFIG[update.type] ?? TYPE_CONFIG.working;
            return (
              <div
                key={update.id ?? i}
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '9px 16px',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, flexShrink: 0,
                }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>
                    {update.message}
                  </div>
                  {(update.sent_whatsapp || update.sent_email) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {update.sent_whatsapp && (
                        <span style={{ fontSize: 10, color: 'var(--accent-mid)', fontWeight: 600 }}>WhatsApp ✓</span>
                      )}
                      {update.sent_email && (
                        <span style={{ fontSize: 10, color: '#1E40AF', fontWeight: 600 }}>Email ✓</span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', flexShrink: 0, paddingTop: 2 }}>
                  {fmt(update.created_at)}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef}/>
      </div>
    </div>
  );
}
