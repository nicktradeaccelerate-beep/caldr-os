'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GuidePanel from '@/components/apprentice/GuidePanel';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ApprenticeUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BudgetStatus {
  used: number;
  total: number;
  pct: number;
}

const NAV_ITEMS = [
  { href: '/dashboard',       label: 'Dashboard', icon: 'grid' },
  { href: '/guide',           label: 'Guide',     icon: 'sparkle' },
  { href: '/portfolio',       label: 'Portfolio', icon: 'award' },
  { href: '/apprentice/code', label: 'Code',      icon: 'code' },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/></>,
  sparkle: <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>,
  award: <><circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>,
  code: <><polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      {ICONS[name]}
    </svg>
  );
}

export default function ApprenticeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<ApprenticeUser | null>(null);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const supabase = createClient();

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/login'); return; }

    const { data: userData } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', authUser.id)
      .single();

    if (!userData) { router.push('/login'); return; }
    if (userData.role !== 'apprentice') {
      router.push('/');
      return;
    }
    setUser(userData as ApprenticeUser);

    // Load budget
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [{ data: budgetData }, { data: usageData }] = await Promise.all([
      supabase.from('user_budgets').select('monthly_budget_gbp').eq('user_id', authUser.id).single(),
      supabase.from('api_usage_log')
        .select('api_cost_gbp')
        .eq('user_id', authUser.id)
        .gte('created_at', monthStart),
    ]);

    if (budgetData) {
      const total = Number(budgetData.monthly_budget_gbp);
      const used = (usageData ?? []).reduce((acc: number, r: { api_cost_gbp: number }) => acc + Number(r.api_cost_gbp), 0);
      setBudget({ used, total, pct: total > 0 ? Math.round((used / total) * 100) : 0 });
    }
  }, [supabase, router]);

  useEffect(() => { loadUser(); }, [loadUser]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const budgetColor = budget
    ? budget.pct >= 95 ? '#DC2626'
      : budget.pct >= 80 ? '#D97706'
      : budget.pct >= 50 ? '#CA8A04'
      : '#16A34A'
    : '#16A34A';

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: '#F8FAFC', fontFamily: 'DM Sans, system-ui, sans-serif', flexDirection: isMobile ? 'column' : 'row' }}>
      {/* Sidebar — desktop only */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: 'white',
        borderRight: '1px solid #E2E8F0',
        display: isMobile ? 'none' : 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100dvh',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
              borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C8.13 3 5 6.13 5 10v9a1 1 0 0 0 1 1h4v-5H7v-5a5 5 0 0 1 10 0v5h-3v5h4a1 1 0 0 0 1-1v-9c0-3.87-3.13-7-7-7z" fill="white"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', letterSpacing: '-0.2px' }}>Newton & Sinclair</div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>Operating Ledger</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', marginBottom: 6 }}>
            Workspace
          </div>
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1B4332' : '#475569',
                  background: active ? '#DCFCE7' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.1s',
                  marginBottom: 2,
                }}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Budget status */}
        {budget && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>AI Budget</span>
              <span style={{ fontSize: 11, color: budgetColor, fontWeight: 700 }}>
                £{budget.used.toFixed(2)} / £{budget.total.toFixed(0)}
              </span>
            </div>
            <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(budget.pct, 100)}%`,
                background: budgetColor,
                borderRadius: 2,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        )}

        {/* User footer */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid #E2E8F0' }}>
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8, marginBottom: 4,
            }}>
              <div style={{
                width: 30, height: 30,
                background: '#DCFCE7', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#1B4332', flexShrink: 0,
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 10, color: '#94A3B8' }}>Apprentice</div>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            style={{
              width: '100%', padding: '7px 10px',
              background: 'none', border: 'none', borderRadius: 8,
              fontSize: 12, color: '#94A3B8', cursor: 'pointer', textAlign: 'left',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', paddingBottom: isMobile ? 64 : 0 }}>
        {children}
      </div>

      {/* Guide panel — desktop only, hidden on task detail pages */}
      {!isMobile && !pathname.startsWith('/apprentice-tasks/') && (
        <GuidePanel pathTaskId={undefined} />
      )}

      {/* Bottom tab bar — mobile only */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'white', borderTop: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        }}>
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '10px 4px 8px',
                  color: active ? '#1B4332' : '#94A3B8',
                  textDecoration: 'none', fontSize: 10, fontWeight: active ? 700 : 500,
                  gap: 3,
                }}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
          {/* Budget indicator dot */}
          {budget && budget.pct >= 80 && (
            <div style={{
              position: 'absolute', top: 8, right: 12, width: 6, height: 6,
              borderRadius: '50%', background: budget.pct >= 95 ? '#DC2626' : '#D97706',
            }} />
          )}
        </nav>
      )}
    </div>
  );
}
