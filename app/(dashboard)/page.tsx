'use client';

import Link from 'next/link';

const MODULES = [
  { href: '/calls',  label: 'Caldr Call',    sub: 'VoIP · Live coaching',    color: '#1B4332', icon: '📞' },
  { href: '/time',   label: 'Time Tracker',   sub: 'Tasks · Hearts · Boss',   color: '#40916C', icon: '⏱' },
  { href: '/ai',     label: 'AI Hub',         sub: 'Claude · GPT · Gemini',   color: '#2D6A4F', icon: '✦' },
  { href: '/brief',  label: 'Daily Brief',    sub: 'Morning AI briefing',     color: '#1B4332', icon: '☀' },
  { href: '/tasks',  label: 'Task Manager',   sub: 'Queue · Categories',      color: '#40916C', icon: '✓' },
  { href: '/boss',   label: 'Boss Updates',   sub: 'Live log · WhatsApp',     color: '#2D6A4F', icon: '📊' },
  { href: '/code',   label: 'Code Env',       sub: 'Editor · AI assist',      color: '#1B4332', icon: '</>' },
];

export default function HomePage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>
          {greeting} 👋
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>{dateStr}</div>
      </div>

      {/* Module grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {MODULES.map(mod => (
          <Link key={mod.href} href={mod.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r)',
              padding: '20px 18px',
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: 'var(--shadow-sm)',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
                (e.currentTarget as HTMLElement).style.transform = 'none';
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                background: `${mod.color}18`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                marginBottom: 14,
              }}>
                {mod.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>
                {mod.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {mod.sub}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
