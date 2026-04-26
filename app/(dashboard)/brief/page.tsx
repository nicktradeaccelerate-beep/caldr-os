'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ClippyCharacter from '@/components/clippy/ClippyCharacter';
import type { User } from '@/types';

interface BriefData {
  brief: string | null;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)',
      padding: '16px 18px', flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? 'var(--accent)', letterSpacing: '-0.5px', marginBottom: 2 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', marginBottom: sub ? 2 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{sub}</div>}
    </div>
  );
}

export default function BriefPage() {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ calls: 0, tasks: 0, hearts: 0, streak: 0, level: 1 });
  const supabase = createClient();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        // Demo fallback
        setStats({ calls: 12, tasks: 4, hearts: 47, streak: 5, level: 3 });
        setLoading(false);
        fetchBrief('demo-user-id');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userData) {
        const u = userData as User;
        setUser(u);

        // Quick stats
        const today = now.toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const [{ count: callsYest }, { count: tasksToday }] = await Promise.all([
          supabase.from('calls').select('*', { count: 'exact', head: true }).eq('va_id', u.id).gte('started_at', yesterday).lt('started_at', today),
          supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', u.id).eq('due_date', today).neq('status', 'done'),
        ]);

        setStats({
          calls:  callsYest ?? 0,
          tasks:  tasksToday ?? 0,
          hearts: u.hearts_total,
          streak: u.streak,
          level:  u.level,
        });

        fetchBrief(u.id);
      }
    }
    load();
  }, []);

  async function fetchBrief(userId: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json() as BriefData;
      setBrief(data.brief ?? null);
    } catch {
      setBrief(null);
    }
    setLoading(false);
  }

  // Parse brief into labelled sections
  function parseBrief(text: string): { label: string; content: string }[] {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const sections: { label: string; content: string }[] = [];
    let currentLabel = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      // Detect numbered headings: "1. Focus", "2. Quick win"
      const headingMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (headingMatch) {
        if (currentLabel && currentContent.length > 0) {
          sections.push({ label: currentLabel, content: currentContent.join(' ') });
        }
        currentLabel = headingMatch[2];
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    if (currentLabel && currentContent.length > 0) {
      sections.push({ label: currentLabel, content: currentContent.join(' ') });
    }
    // If no structure found, return as a single section
    if (sections.length === 0) {
      return [{ label: 'Your brief', content: text }];
    }
    return sections;
  }

  const sections = brief ? parseBrief(brief) : [];

  const SECTION_STYLES = [
    { accent: 'var(--accent)',    bg: 'var(--accent-pale)',  border: 'var(--accent-light)' },
    { accent: '#1E40AF',          bg: 'rgba(30,64,175,0.05)', border: 'rgba(30,64,175,0.15)' },
    { accent: '#B45309',          bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)' },
    { accent: '#6D28D9',          bg: 'rgba(109,40,217,0.06)', border: 'rgba(109,40,217,0.15)' },
  ];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>
          {greeting}{user ? `, ${user.name.split(' ')[0]}` : ''} ☀
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{dayStr}</div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Yesterday's calls" value={stats.calls} />
        <StatCard label="Tasks today" value={stats.tasks} sub="pending" color="#B45309" />
        <StatCard label="Total hearts" value={stats.hearts} sub={`Level ${stats.level}`} color="var(--rose)" />
        <StatCard label="Day streak" value={`${stats.streak}d`} color="#6D28D9" />
      </div>

      {/* AI Brief card */}
      <div style={{
        background: 'var(--white)', borderRadius: 18, border: '1px solid var(--border)',
        overflow: 'hidden', marginBottom: 16,
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <ClippyCharacter mood={loading ? 'thinking' : 'happy'} size={32} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Daily AI Brief</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Personalised briefing from Claude</div>
          </div>
          <button
            onClick={() => fetchBrief(user?.id ?? 'demo-user-id')}
            disabled={loading}
            style={{
              marginLeft: 'auto', padding: '6px 12px',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 11, color: 'var(--ink-2)',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Generating…' : 'Refresh'}
          </button>
        </div>

        <div style={{ padding: '16px 18px' }}>
          {loading ? (
            <div style={{ display: 'flex', gap: 6, padding: '20px 0' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-mid)',
                  animation: `bounce 1s ${i * 0.15}s infinite`,
                }}/>
              ))}
            </div>
          ) : sections.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sections.map((sec, i) => {
                const style = SECTION_STYLES[i % SECTION_STYLES.length];
                return (
                  <div key={i} style={{
                    padding: '12px 14px',
                    background: style.bg,
                    borderRadius: 12,
                    border: `1px solid ${style.border}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: style.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                      {sec.label}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
                      {sec.content}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ink-2)', padding: '12px 0' }}>
              Brief unavailable — Claude API key not configured. Add ANTHROPIC_API_KEY to your .env.local.
            </div>
          )}
        </div>
      </div>

      {/* Push notifications prompt */}
      <PushNudge userId={user?.id ?? null} />

      <style>{`
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

// ── Inline push notification nudge ──────────────────────────
function PushNudge({ userId }: { userId: string | null }) {
  const [shown, setShown] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('caldr-os:push-nudge-dismissed')) return;
    if (localStorage.getItem('caldr-os:push-subbed')) { setSubscribed(true); return; }
    if ('Notification' in window && Notification.permission === 'granted') { setSubscribed(true); return; }
    setShown(true);
  }, []);

  async function enable() {
    if (!userId || !('serviceWorker' in navigator)) return;
    setRequesting(true);
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setSubscribed(true);
      localStorage.setItem('caldr-os:push-subbed', '1');
      setShown(false);
    }
    setRequesting(false);
  }

  if (!shown || subscribed) return null;

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: 'var(--accent-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>Enable push notifications</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>Get boss updates and task reminders even when the app is closed.</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setShown(false); localStorage.setItem('caldr-os:push-nudge-dismissed', '1'); }} style={{ padding: '6px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--ink-3)', cursor: 'pointer' }}>
          Not now
        </button>
        <button onClick={enable} disabled={requesting} style={{ padding: '6px 14px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: requesting ? 'wait' : 'pointer' }}>
          {requesting ? '…' : 'Enable'}
        </button>
      </div>
    </div>
  );
}
