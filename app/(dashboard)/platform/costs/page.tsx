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

interface UserRow { id: string; name: string; }
interface BudgetRow { user_id: string; monthly_budget_gbp: number; }

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px 20px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ?? 'var(--ink)', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function BudgetBar({ used, budget, name }: { used: number; budget: number; name: string }) {
  const pct = budget > 0 ? Math.min(Math.round((used / budget) * 100), 100) : 0;
  const color = pct >= 95 ? '#DC2626' : pct >= 80 ? '#D97706' : 'var(--accent)';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>
          £{used.toFixed(3)} <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>/ £{budget.toFixed(0)}</span>
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>{pct}% of monthly budget</div>
    </div>
  );
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
  const avgCost = usage.length > 0 ? totalCost / usage.length : 0;

  const byUser: Record<string, number> = {};
  for (const r of usage) byUser[r.user_id] = (byUser[r.user_id] ?? 0) + Number(r.api_cost_gbp);

  const byFeature: Record<string, number> = {};
  for (const r of usage) byFeature[r.feature] = (byFeature[r.feature] ?? 0) + Number(r.api_cost_gbp);

  const byModel: Record<string, number> = {};
  for (const r of usage) byModel[r.model] = (byModel[r.model] ?? 0) + Number(r.api_cost_gbp);

  const topFeature = Object.entries(byFeature).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Breadcrumb + heading */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Link href="/platform" style={{ fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none' }}>Platform</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Costs</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: '0 0 2px', letterSpacing: '-0.3px' }}>API costs</h1>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          {/* Stat row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatCard label="Total spend" value={`£${totalCost.toFixed(4)}`} sub="this calendar month" />
            <StatCard label="API calls" value={usage.length} sub="across all features" />
            <StatCard label="Avg per call" value={`£${avgCost.toFixed(5)}`} sub="mean cost" />
            <StatCard label="Top feature" value={topFeature} sub="by spend" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* By user with budget bars */}
            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Budget utilisation</span>
              </div>
              <div style={{ padding: '16px 18px' }}>
                {Object.entries(byUser).sort((a, b) => b[1] - a[1]).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No usage this month.</div>
                ) : (
                  Object.entries(byUser).sort((a, b) => b[1] - a[1]).map(([uid, cost]) => (
                    <BudgetBar
                      key={uid}
                      name={users[uid] ?? uid.slice(0, 8)}
                      used={cost}
                      budget={budgets[uid] ?? 50}
                    />
                  ))
                )}
              </div>
            </div>

            {/* By feature + model */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>By feature</span>
                </div>
                <div style={{ padding: '12px 18px' }}>
                  {Object.entries(byFeature).sort((a, b) => b[1] - a[1]).map(([feature, cost]) => {
                    const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0;
                    return (
                      <div key={feature} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: 'var(--ink)' }}>{feature}</span>
                          <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'monospace' }}>£{cost.toFixed(4)}</span>
                        </div>
                        <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-mid)', borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(byFeature).length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No usage.</div>}
                </div>
              </div>

              <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>By model</span>
                </div>
                <div style={{ padding: '12px 18px' }}>
                  {Object.entries(byModel).sort((a, b) => b[1] - a[1]).map(([model, cost]) => (
                    <div key={model} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink)' }}>{model.replace('claude-', '').replace(/-\d{8}$/, '')}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'monospace' }}>£{cost.toFixed(4)}</span>
                    </div>
                  ))}
                  {Object.keys(byModel).length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No usage.</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Recent calls log */}
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Recent calls</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 8 }}>last {Math.min(usage.length, 20)} of {usage.length}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Time', 'User', 'Feature', 'Model', 'Cost'].map(h => (
                      <th key={h} style={{ padding: '8px 18px', textAlign: h === 'Cost' ? 'right' : 'left', color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usage.slice(0, 20).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 18px', color: 'var(--ink-3)' }}>
                        {new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '8px 18px', color: 'var(--ink-2)' }}>
                        {users[r.user_id] ?? r.user_id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '8px 18px', color: 'var(--ink)' }}>{r.feature}</td>
                      <td style={{ padding: '8px 18px', color: 'var(--ink-2)' }}>
                        {r.model.replace('claude-', '').replace(/-\d{8}$/, '')}
                      </td>
                      <td style={{ padding: '8px 18px', textAlign: 'right', color: 'var(--ink)', fontWeight: 600 }}>
                        £{Number(r.api_cost_gbp).toFixed(5)}
                      </td>
                    </tr>
                  ))}
                  {usage.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '16px 18px', color: 'var(--ink-3)', textAlign: 'center' }}>
                        No API calls this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
