'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types';

const NAV = [
  { href: '/master/team',     label: 'Team',     icon: 'team' },
  { href: '/master/library',  label: 'Library',  icon: 'library' },
  { href: '/master/training', label: 'Training', icon: 'training' },
  { href: '/master/access',   label: 'Access',   icon: 'access' },
];

const ICONS: Record<string, React.ReactNode> = {
  team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="18" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M21 20c0-2.8-1.8-5-4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  library: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  training: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 3L2 8l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  access: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
    </svg>
  ),
};

interface AlertBanner {
  vaName: string;
  contactName: string | null;
  duration: number;
}

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [liveAlert, setLiveAlert] = useState<AlertBanner | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: u } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      if (u) setUser(u as User);
    });

    // Poll for active calls to show banner
    const poll = setInterval(async () => {
      // In production: subscribe to calls channel via Supabase Realtime
      // For now: poll every 30s
    }, 30_000);
    return () => clearInterval(poll);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#0F0E1A' }}>
      {/* Dark sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: '#1E1B4B',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100dvh',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 16px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C8.13 3 5 6.13 5 10v9a1 1 0 0 0 1 1h4v-5H7v-5a5 5 0 0 1 10 0v5h-3v5h4a1 1 0 0 0 1-1v-9c0-3.87-3.13-7-7-7z" fill="rgba(255,255,255,0.9)"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'white', letterSpacing: '-0.2px' }}>Caldr OS</div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)',
              marginTop: 1,
            }}>Master View</div>
          </div>
        </div>

        {/* Role badge */}
        {user && (
          <div style={{ padding: '10px 16px 0' }}>
            <span style={{
              display: 'inline-block', padding: '3px 8px',
              background: 'rgba(99,102,241,0.2)',
              color: '#A5B4FC',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 20, fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {user.role}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8,
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? 'white' : 'rgba(255,255,255,0.5)',
                background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                textDecoration: 'none', marginBottom: 2,
                transition: 'all 0.12s',
              }}>
                <span style={{ opacity: active ? 1 : 0.7 }}>{ICONS[item.icon]}</span>
                {item.label}
              </Link>
            );
          })}

          {/* Back to VA view */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8,
              fontSize: 12, color: 'rgba(255,255,255,0.35)',
              textDecoration: 'none',
            }}>
              ← VA Dashboard
            </Link>
          </div>
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 8px' }}>
          {user && (
            <div style={{ padding: '6px 10px', marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{user.email}</div>
            </div>
          )}
          <button onClick={handleSignOut} style={{
            width: '100%', padding: '7px 10px',
            background: 'none', border: 'none',
            fontSize: 12, color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer', textAlign: 'left',
          }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Live call alert banner */}
        {liveAlert && (
          <div style={{
            padding: '10px 24px',
            background: 'rgba(74,222,128,0.12)',
            borderBottom: '1px solid rgba(74,222,128,0.2)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', animation: 'pulse 2s infinite' }}/>
            <div style={{ fontSize: 13, color: '#4ADE80', fontWeight: 600 }}>
              {liveAlert.vaName} is on a live call with {liveAlert.contactName ?? 'unknown'} — {liveAlert.duration}m
            </div>
            <Link href="/master/team" style={{ marginLeft: 'auto', fontSize: 12, color: '#4ADE80', textDecoration: 'underline' }}>
              Supervise
            </Link>
          </div>
        )}

        <main style={{ flex: 1, padding: 28, overflowY: 'auto', background: '#0F0E1A' }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(74,222,128,0.2); }
          50% { box-shadow: 0 0 0 5px rgba(74,222,128,0.08); }
        }
      `}</style>
    </div>
  );
}
