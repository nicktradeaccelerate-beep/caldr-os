'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface UsageRow {
  user_id: string;
  feature: string;
  model: string;
  api_cost_gbp: number;
  project_id: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string;
}

interface BudgetRow {
  user_id: string;
  monthly_budget_gbp: number;
}

export default function CostsPage() {
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [usageRes, usersRes, budgetsRes] = await Promise.all([
      supabase.from('api_usage_log').select('user_id, feature, model, api_cost_gbp, project_id, created_at')
        .gte('created_at', monthStart).order('created_at', { ascending: false }),
      supabase.from('users').select('id, name'),
      supabase.from('user_budgets').select('user_id, monthly_budget_gbp'),
    ]);

    setUsage((usageRes.data ?? []) as UsageRow[]);

    const userMap: Record<string, string> = {};
    for (const u of (usersRes.data ?? []) as UserRow[]) userMap[u.id] = u.name;
    setUsers(userMap);

    const budgetMap: Record<string, number> = {};
    for (const b of (budgetsRes.data ?? []) as BudgetRow[]) budgetMap[b.user_id] = Number(b.monthly_budget_gbp);
    setBudgets(budgetMap);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const totalCost = usage.reduce((a, r) => a + Number(r.api_cost_gbp), 0);

  // By user
  const byUser: Record<string, number> = {};
  for (const r of usage) byUser[r.user_id] = (byUser[r.user_id] ?? 0) + Number(r.api_cost_gbp);

  // By feature
  const byFeature: Record<string, number> = {};
  for (const r of usage) byFeature[r.feature] = (byFeature[r.feature] ?? 0) + Number(r.api_cost_gbp);

  // By model
  const byModel: Record<string, number> = {};
  for (const r of usage) byModel[r.model] = (byModel[r.model] ?? 0) + Number(r.api_cost_gbp);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Platform</Link>
          <span style={{ color: 'var(--ink-3)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--ink)' }}>Costs</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>API costs</h1>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>This calendar month</div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div>
          {/* Total */}
          <div style={{
            background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)',
            padding: '18px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total spend</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.5px' }}>£{totalCost.toFixed(4)}</div>
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>{usage.length} API calls this month</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* By user */}
            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>By user</div>
              {Object.entries(byUser).sort((a, b) => b[1] - a[1]).map(([uid, cost]) => {
                const budget = budgets[uid] ?? 50;
                const pct = Math.round((cost / budget) * 100);
                return (
                  <div key={uid} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink)' }}>{users[uid] ?? uid.slice(0, 8)}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: pct >= 80 ? '#DC2626' : 'var(--accent)' }}>
                        £{cost.toFixed(3)} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct >= 80 ? '#DC2626' : 'var(--accent)', borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(byUser).length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No usage.</div>}
            </div>

            {/* By feature */}
            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>By feature</div>
              {Object.entries(byFeature).sort((a, b) => b[1] - a[1]).map(([feature, cost]) => (
                <div key={feature} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink)' }}>{feature}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>£{cost.toFixed(4)}</span>
                </div>
              ))}
              {Object.keys(byFeature).length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No usage.</div>}
            </div>

            {/* By model */}
            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>By model</div>
              {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([model, cost]) => (
                <div key={model} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--ink)' }}>{model.replace('claude-', '').replace('-20250514', '')}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>£{cost.toFixed(4)}</span>
                </div>
              ))}
              {Object.keys(byModel).length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No usage.</div>}
            </div>
          </div>

          {/* Recent calls */}
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 18px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Recent API calls</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11 }}>
              {usage.slice(0, 20).map((r, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'center',
                  padding: '5px 0', borderBottom: '1px solid var(--border)',
                  color: 'var(--ink-2)',
                }}>
                  <span style={{ width: 90, color: 'var(--ink-3)' }}>
                    {new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ width: 140 }}>{users[r.user_id] ?? r.user_id.slice(0, 8)}</span>
                  <span style={{ flex: 1 }}>{r.feature}</span>
                  <span style={{ width: 70, textAlign: 'right', color: 'var(--ink)' }}>£{Number(r.api_cost_gbp).toFixed(5)}</span>
                </div>
              ))}
              {usage.length === 0 && <div style={{ color: 'var(--ink-3)' }}>No API calls this month.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
