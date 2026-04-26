'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Apprentice {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

interface BudgetUsage {
  userId: string;
  used: number;
  total: number;
  pct: number;
}

export default function ApprenticesPage() {
  const [apprentices, setApprentices] = useState<Apprentice[]>([]);
  const [budgets, setBudgets] = useState<BudgetUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: appData } = await supabase
      .from('users')
      .select('id, name, email, status, created_at')
      .eq('role', 'apprentice')
      .order('created_at', { ascending: false });

    const apps = (appData ?? []) as Apprentice[];
    setApprentices(apps);

    if (apps.length > 0) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const ids = apps.map(a => a.id);

      const [budgetData, usageData] = await Promise.all([
        supabase.from('user_budgets').select('user_id, monthly_budget_gbp').in('user_id', ids),
        supabase.from('api_usage_log').select('user_id, api_cost_gbp').in('user_id', ids).gte('created_at', monthStart),
      ]);

      const usageByUser: Record<string, number> = {};
      for (const u of usageData.data ?? []) {
        usageByUser[u.user_id] = (usageByUser[u.user_id] ?? 0) + Number(u.api_cost_gbp);
      }

      const budgetMap: Record<string, number> = {};
      for (const b of budgetData.data ?? []) {
        budgetMap[b.user_id] = Number(b.monthly_budget_gbp);
      }

      setBudgets(apps.map(a => {
        const used = usageByUser[a.id] ?? 0;
        const total = budgetMap[a.id] ?? 50;
        return { userId: a.id, used, total, pct: total > 0 ? Math.round((used / total) * 100) : 0 };
      }));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const getBudget = (userId: string) => budgets.find(b => b.userId === userId);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Link href="/platform" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Platform</Link>
            <span style={{ color: 'var(--ink-3)' }}>/</span>
            <span style={{ fontSize: 13, color: 'var(--ink)' }}>Apprentices</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Apprentices</h1>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : apprentices.length === 0 ? (
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>No apprentice accounts yet.</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Create a user in Supabase Auth with <code>role = 'apprentice'</code> to get started.
          </div>
        </div>
      ) : (
        <div>
          {apprentices.map(app => {
            const budget = getBudget(app.id);
            const budgetColor = budget
              ? budget.pct >= 95 ? '#DC2626'
                : budget.pct >= 80 ? '#D97706'
                : '#16A34A'
              : '#16A34A';

            return (
              <Link key={app.id} href={`/platform/apprentices/${app.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)',
                  padding: '16px 20px', marginBottom: 10, display: 'flex',
                  alignItems: 'center', gap: 14, cursor: 'pointer',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'var(--accent-light)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
                  }}>
                    {app.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{app.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{app.email}</div>
                  </div>
                  {budget && (
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: budgetColor, marginBottom: 4 }}>
                        £{budget.used.toFixed(2)} / £{budget.total.toFixed(0)}
                      </div>
                      <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${Math.min(budget.pct, 100)}%`,
                          background: budgetColor, borderRadius: 2,
                        }} />
                      </div>
                    </div>
                  )}
                  <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
