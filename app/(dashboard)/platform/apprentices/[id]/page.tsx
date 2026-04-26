'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Apprentice {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  module_type: string;
}

interface ProjectAccessRow {
  id: string;
  project_id: string;
  access_level: string;
  granted_at: string;
  projects: Project | null;
}

interface Action {
  id: string;
  action_type: string;
  target_table: string | null;
  target_id: string | null;
  reversible: boolean;
  reverted_at: string | null;
  created_at: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
}

interface Budget {
  monthly_budget_gbp: number;
}

export default function ApprenticeDetailPage() {
  const params = useParams<{ id: string }>();
  const [apprentice, setApprentice] = useState<Apprentice | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [access, setAccess] = useState<ProjectAccessRow[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetUsed, setBudgetUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [newBudget, setNewBudget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const id = params.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [userRes, projectsRes, accessRes, actionsRes, budgetRes, usageRes] = await Promise.all([
      supabase.from('users').select('id, name, email, role, status').eq('id', id).single(),
      supabase.from('projects').select('id, name, slug, module_type'),
      supabase.from('project_access').select('id, project_id, access_level, granted_at, projects(id, name, slug, module_type)').eq('user_id', id),
      supabase.from('actions').select('id, action_type, target_table, target_id, reversible, reverted_at, created_at, before_state, after_state').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
      supabase.from('user_budgets').select('monthly_budget_gbp').eq('user_id', id).single(),
      supabase.from('api_usage_log').select('api_cost_gbp').eq('user_id', id).gte('created_at', monthStart),
    ]);

    setApprentice(userRes.data as Apprentice | null);
    setProjects((projectsRes.data ?? []) as Project[]);
    setAccess((accessRes.data ?? []) as unknown as ProjectAccessRow[]);
    setActions((actionsRes.data ?? []) as Action[]);
    setBudget(budgetRes.data ?? null);
    setNewBudget(String(budgetRes.data?.monthly_budget_gbp ?? 50));
    const used = (usageRes.data ?? []).reduce((a: number, r: { api_cost_gbp: number }) => a + Number(r.api_cost_gbp), 0);
    setBudgetUsed(used);
    setLoading(false);
  }, [supabase, params.id]);

  useEffect(() => { load(); }, [load]);

  async function grantAccess(projectId: string, level: string) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    await supabase.from('project_access').upsert({
      user_id: params.id,
      project_id: projectId,
      access_level: level,
      granted_by: authUser?.id,
    }, { onConflict: 'user_id,project_id' });
    await load();
  }

  async function revokeAccess(accessId: string) {
    await supabase.from('project_access').delete().eq('id', accessId);
    await load();
  }

  async function revertAction(action: Action) {
    if (!action.reversible || action.reverted_at) return;
    setRevertingId(action.id);

    if (action.target_table && action.target_id && action.before_state) {
      await supabase
        .from(action.target_table)
        .update(action.before_state as Record<string, unknown>)
        .eq('id', action.target_id as string);
    }

    await supabase.from('actions').update({ reverted_at: new Date().toISOString() }).eq('id', action.id);
    await load();
    setRevertingId(null);
  }

  async function revertLastN(n: number) {
    const toRevert = actions.filter(a => a.reversible && !a.reverted_at).slice(0, n);
    for (const action of toRevert) {
      await revertAction(action);
    }
  }

  async function resetToSeed() {
    const irreversible = actions.filter(a => !a.reversible && !a.reverted_at);
    if (irreversible.length > 0) {
      if (!confirm(`Warning: ${irreversible.length} irreversible action(s) cannot be reverted. Continue with reset?`)) return;
    }
    const toRevert = actions.filter(a => a.reversible && !a.reverted_at);
    for (const action of toRevert) {
      await revertAction(action);
    }
  }

  async function saveBudget() {
    setSavingBudget(true);
    const val = parseFloat(newBudget);
    if (!isNaN(val) && val > 0) {
      await supabase.from('user_budgets').upsert({
        user_id: params.id,
        monthly_budget_gbp: val,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setBudget({ monthly_budget_gbp: val });
    }
    setSavingBudget(false);
  }

  if (loading || !apprentice) {
    return <div style={{ padding: 28, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>;
  }

  const budgetTotal = budget?.monthly_budget_gbp ?? 50;
  const budgetPct = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/platform" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Platform</Link>
        <span style={{ color: 'var(--ink-3)' }}>/</span>
        <Link href="/platform/apprentices" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Apprentices</Link>
        <span style={{ color: 'var(--ink-3)' }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--ink)' }}>{apprentice.name}</span>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: 'var(--accent)',
        }}>
          {apprentice.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0, marginBottom: 2 }}>
            {apprentice.name}
          </h1>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{apprentice.email}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Budget */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Monthly budget</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>Used this month</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: budgetPct >= 80 ? '#DC2626' : 'var(--accent)' }}>
                £{budgetUsed.toFixed(2)} / £{budgetTotal.toFixed(0)} ({budgetPct}%)
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(budgetPct, 100)}%`,
                background: budgetPct >= 95 ? '#DC2626' : budgetPct >= 80 ? '#D97706' : 'var(--accent)',
                borderRadius: 3,
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="number"
              value={newBudget}
              onChange={e => setNewBudget(e.target.value)}
              min="1"
              step="5"
              style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
            />
            <button
              onClick={saveBudget}
              disabled={savingBudget}
              style={{
                padding: '7px 14px', background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: savingBudget ? 'wait' : 'pointer',
              }}
            >
              {savingBudget ? 'Saving…' : 'Update'}
            </button>
          </div>
        </div>

        {/* Project access */}
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Project access</div>
          {projects.map(project => {
            const existing = access.find(a => a.project_id === project.id);
            return (
              <div key={project.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{project.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{project.slug}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {existing ? (
                    <>
                      <span style={{ fontSize: 10, background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                        {existing.access_level}
                      </span>
                      <button
                        onClick={() => revokeAccess(existing.id)}
                        style={{ fontSize: 10, padding: '2px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--ink-3)' }}
                      >
                        Revoke
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => grantAccess(project.id, 'contribute')}
                      style={{ fontSize: 10, padding: '3px 10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Grant access
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action ledger */}
      <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Action ledger</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => revertLastN(5)}
              style={{ fontSize: 11, padding: '4px 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--ink-2)' }}
            >
              Revert last 5
            </button>
            <button
              onClick={resetToSeed}
              style={{ fontSize: 11, padding: '4px 12px', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 6, cursor: 'pointer', color: '#DC2626', fontWeight: 600 }}
            >
              Reset to seed
            </button>
          </div>
        </div>
        {actions.length === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No actions logged yet.</div>
        ) : (
          <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {actions.map(action => (
              <div key={action.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '7px 0', borderBottom: '1px solid var(--border)',
                opacity: action.reverted_at ? 0.4 : 1,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: action.reverted_at ? '#94A3B8' : action.reversible ? '#16A34A' : '#F59E0B',
                }} />
                <span style={{ flex: 1, color: 'var(--ink)', fontSize: 12 }}>
                  {action.action_type}
                  {action.target_table && ` → ${action.target_table}`}
                  {action.reverted_at && ' (reverted)'}
                </span>
                <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>
                  {new Date(action.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {action.reversible && !action.reverted_at && (
                  <button
                    onClick={() => revertAction(action)}
                    disabled={revertingId === action.id}
                    style={{ fontSize: 10, padding: '2px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--ink-3)' }}
                  >
                    {revertingId === action.id ? '…' : 'Revert'}
                  </button>
                )}
                {!action.reversible && !action.reverted_at && (
                  <span style={{ fontSize: 9, color: '#D97706', background: '#FEF3C7', padding: '1px 5px', borderRadius: 3 }}>
                    irreversible
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
