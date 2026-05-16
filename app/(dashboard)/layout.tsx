'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import OfflineBanner from '@/components/shared/OfflineBanner';
import OnboardingTour from '@/components/clippy/OnboardingTour';
import type { User } from '@/types';

const NAV_ITEMS = [
  { href: '/',              label: 'Home',        icon: 'home' },
  { href: '/calls',         label: 'Calls',       icon: 'phone' },
  { href: '/time',          label: 'Time',        icon: 'clock' },
  { href: '/ai',            label: 'AI Hub',      icon: 'sparkle' },
  { href: '/tasks',         label: 'Tasks',       icon: 'check' },
  { href: '/brief',         label: 'Brief',       icon: 'sun' },
  { href: '/boss',          label: 'Boss',        icon: 'signal' },
  { href: '/code',          label: 'Code',        icon: 'code' },
  { href: '/bfb/templates', label: 'BFB',         icon: 'mail', ownerOnly: true },
  { href: '/master/team',   label: 'Master',      icon: 'user', ownerOnly: true },
  { href: '/platform',      label: 'Platform',    icon: 'platform', ownerOnly: true },
  { href: '/admin/billing', label: 'Admin',       icon: 'settings', ownerOnly: true },
];

const ICONS: Record<string, React.ReactNode> = {
  home:    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>,
  phone:   <><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.58a1 1 0 0 1-.25 1.02L6.6 10.8z" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
  clock:   <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  sparkle: <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>,
  check:   <><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  sun:     <><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  signal:  <><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
  code:    <><polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
  user:    <><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>,
  settings: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
  mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5" fill="none"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.5"/></>,
  platform: <><rect x="3" y="3" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="3" y="11" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="13" y="11" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      {ICONS[name]}
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [dark, setDark] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async (result: Awaited<ReturnType<typeof supabase.auth.getUser>>) => {
      const authUser = result.data.user;
      if (!authUser) return;
      const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      if (userData) setUser(userData as User);
    });
    // Show onboarding tour on first visit
    if (typeof window !== 'undefined' && !localStorage.getItem('caldr-os:toured')) {
      setTimeout(() => setShowTour(true), 800);
    }
    // Restore dark mode preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('caldr-os:dark') === '1';
      setDark(saved);
      if (saved) document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('caldr-os:dark', '1');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('caldr-os:dark');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--white)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100dvh',
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 16px 14px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C8.13 3 5 6.13 5 10v9a1 1 0 0 0 1 1h4v-5H7v-5a5 5 0 0 1 10 0v5h-3v5h4a1 1 0 0 0 1-1v-9c0-3.87-3.13-7-7-7z" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', letterSpacing: '-0.2px' }}>Caldr OS</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 1 }}>
              {user?.name ?? '…'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            // Hide owner-only items for VAs
            if (item.ownerOnly && user && !['owner', 'manager', 'operator'].includes(user.role)) return null;
            const active = pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 'var(--r-sm)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--ink-2)',
                  background: active ? 'var(--accent-light)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.12s',
                  marginBottom: 2,
                }}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 8px' }}>
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 'var(--r-sm)',
              marginBottom: 4,
            }}>
              <div style={{
                width: 28, height: 28,
                background: 'var(--accent-light)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--accent)',
                flexShrink: 0,
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.role}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={toggleDark}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'none',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              fontSize: 12,
              color: 'var(--ink-3)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'color 0.12s',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              {dark
                ? <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                : <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.5" fill="none"/>}
            </svg>
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'none',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              fontSize: 12,
              color: 'var(--ink-3)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'color 0.12s',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <OfflineBanner />
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      {showTour && (
        <OnboardingTour onComplete={() => {
          setShowTour(false);
          if (typeof window !== 'undefined') localStorage.setItem('caldr-os:toured', '1');
        }} />
      )}
    </div>
  );
}
