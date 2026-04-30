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

interface TaskCounts {
  userId: string;
  active: number;
  submitted: number;
  approved: number;
}

function Avatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: 'var(--accent-light)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 15, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'online' ? '#16A34A' : status === 'on-call' ? '#D97706' : '#CBD5E1';
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, flexShrink: 0,
    }} />
  );
}

export default function ApprenticesPage() {
  const [apprentices, setApprentices] = useState<Apprentice[]>([]);
  const [budgets, setBudgets] = useState<BudgetUsage[]>([]);
  const [taskCounts, setTaskCounts] = useState<TaskCounts[]>([]);
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

      const [budgetData, usageData, tasksData] = await Promise.all([
        supabase.from('user_budgets').select('user_id, monthly_budget_gbp').in('user_id', ids),
        supabase.from('api_usage_log').select('user_id, api_cost_gbp').in('user_id', ids).gte('created_at', monthStart),
        supabase.from('tasks').select('assigned_to, kanban_status').in('assigned_to', ids),
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

      const countMap: Record<string, { active: number; submitted: number; approved: number }> = {};
      for (const t of tasksData.data ?? []) {
        const uid = t.assigned_to as string;
        if (!uid) continue;
        if (!countMap[uid]) countMap[uid] = { active: 0, submitted: 0, approved: 0 };
        if (t.kanban_status === 'doing') countMap[uid].active++;
        if (t.kanban_status === 'in_review') countMap[uid].submitted++;
        if (t.kanban_status === 'approved') countMap[uid].approved++;
      }
      setTaskCounts(apps.map(a => ({ userId: a.id, ...(countMap[a.id] ?? { active: 0, submitted: 0, approved: 0 }) })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const getBudget = (userId: string) => budgets.find(b => b.userId === userId);
  const getCounts = (userId: string) => taskCounts.find(c => c.userId === userId);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Breadcrumb + heading */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Link href="/platform" style={{ fontSize: 12, color: 'var(--ink-3)', textDecoration: 'none' }}>Platform</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Apprentices</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-0.3px' }}>
            Apprentices
            {!loading && (
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 10 }}>
                {apprentices.length}
              </span>
            )}
          </h1>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 86, background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </div>
      ) : apprentices.length === 0 ? (
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>No apprentice accounts yet.</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            Create a user in Supabase Auth with <code style={{ background: 'var(--card)', padding: '1px 5px', borderRadius: 4 }}>role = 'apprentice'</code> to get started.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {apprentices.map(app => {
            const budget = getBudget(app.id);
            const counts = getCounts(app.id);
            const budgetColor = budget
              ? budget.pct >= 95 ? '#DC2626' : budget.pct >= 80 ? '#D97706' : 'var(--accent)'
              : 'var(--accent)';

            return (
              <Link key={app.id} href={`/platform/apprentices/${app.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)',
                  padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'border-color 0.1s, box-shadow 0.1s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-mid)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
                >
                  <Avatar name={app.name} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{app.name}</span>
                      <StatusDot status={app.status} />
                      <span style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'capitalize' }}>{app.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>{app.email}</div>

                    {/* Task status pills */}
                    {counts && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {counts.active > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#EFF6FF', color: '#1D4ED8' }}>
                            {counts.active} active
                          </span>
                        )}
                        {counts.submitted > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#FEF3C7', color: '#92400E' }}>
                            {counts.submitted} in review
                          </span>
                        )}
                        {counts.approved > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#DCFCE7', color: '#166534' }}>
                            {counts.approved} approved
                          </span>
                        )}
                        {counts.active === 0 && counts.submitted === 0 && counts.approved === 0 && (
                          <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>No tasks assigned</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Budget */}
                  {budget && (
                    <div style={{ minWidth: 120, textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: budgetColor, marginBottom: 6 }}>
                        £{budget.used.toFixed(2)}
                        <span style={{ fontWeight: 400, color: 'var(--ink-3)' }}> / £{budget.total.toFixed(0)}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${Math.min(budget.pct, 100)}%`,
                          background: budgetColor, borderRadius: 2, transition: 'width 0.4s',
                        }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 3 }}>{budget.pct}% of budget</div>
                    </div>
                  )}

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
