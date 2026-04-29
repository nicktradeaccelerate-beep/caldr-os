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

interface User {
  id: string;
  name: string;
  role: string;
}

function formatPeriod(start: string) {
  return new Date(start).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function isToday(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

function isYesterday(ts: string) {
  const d = new Date(ts);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
}

function relativeDay(ts: string) {
  if (isToday(ts)) return 'Today';
  if (isYesterday(ts)) return 'Yesterday';
  return null;
}

function CollapseIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function NarrativePage() {
  const [logs, setLogs] = useState<NarrativeLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const load = useCallback(async () => {
    const [logsRes, usersRes] = await Promise.all([
      supabase
        .from('narrative_logs')
        .select('id, content, generated_at, period_start, period_end')
        .order('generated_at', { ascending: false })
        .limit(30),
      supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['apprentice', 'operator', 'owner', 'manager']),
    ]);
    const fetchedLogs = (logsRes.data ?? []) as NarrativeLog[];
    setLogs(fetchedLogs);
    setUsers((usersRes.data ?? []) as User[]);
    // Auto-expand today's log
    const todayLog = fetchedLogs.find(l => isToday(l.generated_at) || isYesterday(l.generated_at));
    if (todayLog) setExpandedIds(new Set([todayLog.id]));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generateNow() {
    setGenerating(true);
    try {
      const res = await fetch('/api/platform/narrative/generate', { method: 'POST' });
      if (res.ok) await load();
    } finally {
      setGenerating(false);
    }
  }

  const filtered = logs.filter(l =>
    !search || l.content.toLowerCase().includes(search.toLowerCase())
  );

  const latestLog = logs[0] ?? null;
  const historyLogs = filtered.slice(latestLog ? 1 : 0);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Platform</Link>
          <span style={{ color: 'var(--ink-3)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--ink)' }}>Narrative log</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>Daily narrative log</h1>
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
              Generated nightly at 23:00 UTC. Covers platform activity, API spend, and any escalations.
            </p>
          </div>
          <button
            onClick={generateNow}
            disabled={generating}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: generating ? 'var(--bg)' : 'var(--accent)',
              color: generating ? 'var(--ink-3)' : 'white',
              border: 'none', cursor: generating ? 'default' : 'pointer',
              fontSize: 12, fontWeight: 600, flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {generating ? 'Generating…' : 'Generate now'}
          </button>
        </div>
      </div>

      {/* Platform users strip */}
      {users.length > 0 && (
        <div style={{
          background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Platform users
          </span>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: u.role === 'apprentice' ? '#DCFCE7' : 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                color: u.role === 'apprentice' ? '#1B4332' : 'var(--accent)',
              }}>
                {u.name.charAt(0)}
              </div>
              <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{u.name}</span>
              <span style={{
                fontSize: 9, color: 'var(--ink-3)', background: 'var(--bg)',
                padding: '1px 5px', borderRadius: 3, textTransform: 'capitalize',
              }}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          {/* Today's / latest summary — always visible */}
          {latestLog ? (
            <div style={{
              background: 'var(--white)', borderRadius: 14,
              border: '1.5px solid var(--accent-light)',
              padding: '20px 24px', marginBottom: 24,
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, background: 'var(--accent)',
                    color: 'white', padding: '2px 8px', borderRadius: 4,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {relativeDay(latestLog.generated_at) ?? 'Latest'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {formatPeriod(latestLog.period_start)}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  Generated at {formatTime(latestLog.generated_at)}
                </span>
              </div>
              <p style={{
                fontSize: 13, color: 'var(--ink)', lineHeight: 1.75,
                margin: 0, whiteSpace: 'pre-wrap',
              }}>
                {latestLog.content}
              </p>
            </div>
          ) : (
            <div style={{
              background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)',
              padding: '32px 24px', textAlign: 'center', marginBottom: 24,
            }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>No narrative logs yet</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16 }}>
                The first log will generate tonight at 23:00 UTC. You can also trigger one now.
              </div>
              <button
                onClick={generateNow}
                disabled={generating}
                style={{
                  padding: '8px 20px', borderRadius: 8, background: 'var(--accent)',
                  color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}
              >
                {generating ? 'Generating…' : 'Generate first log'}
              </button>
            </div>
          )}

          {/* 30-day history */}
          {historyLogs.length > 0 && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 12, gap: 12,
              }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                  History — last 30 days
                </h2>
                <input
                  type="text"
                  placeholder="Search logs…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    padding: '6px 11px', border: '1px solid var(--border)', borderRadius: 7,
                    fontSize: 12, width: 180, background: 'var(--white)', color: 'var(--ink)',
                    outline: 'none',
                  }}
                />
              </div>

              {historyLogs.length === 0 && search && (
                <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: '16px 0' }}>
                  No results for &ldquo;{search}&rdquo;.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {historyLogs.map(log => {
                  const expanded = expandedIds.has(log.id);
                  return (
                    <div key={log.id} style={{
                      background: 'var(--white)', borderRadius: 10,
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                    }}>
                      <button
                        onClick={() => toggleExpand(log.id)}
                        style={{
                          width: '100%', padding: '13px 16px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'none', border: 'none', cursor: 'pointer',
                          textAlign: 'left', gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                            {formatPeriod(log.period_start)}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                            {formatTime(log.generated_at)}
                          </span>
                        </div>
                        <div style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                          <CollapseIcon open={expanded} />
                        </div>
                      </button>

                      {expanded && (
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                          <p style={{
                            fontSize: 13, color: 'var(--ink)', lineHeight: 1.75,
                            margin: '12px 0 0', whiteSpace: 'pre-wrap',
                          }}>
                            {log.content}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
