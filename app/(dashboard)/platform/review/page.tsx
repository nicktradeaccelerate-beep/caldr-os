'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import DiffViewer from '@/components/shared/DiffViewer';

interface Submission {
  id: string;
  task_id: string | null;
  status: string;
  narrative: string | null;
  submitted_at: string | null;
  self_check_results: { score?: string; checks?: boolean[] } | null;
  diff_summary: { action_count?: number; actions?: string[] } | null;
  video_link: string | null;
  review_notes: string | null;
  users: { name: string; email: string } | null;
  tasks: { title: string | null; text: string; success_criteria: string[] | null } | null;
  projects: { name: string } | null;
}

interface TaskAction {
  id: string;
  action_type: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
}

export default function ReviewQueuePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actioning, setActioning] = useState(false);
  const [taskActions, setTaskActions] = useState<TaskAction[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('submissions')
      .select('id, task_id, status, narrative, submitted_at, self_check_results, diff_summary, video_link, review_notes, users(name, email), tasks(title, text, success_criteria), projects(name)')
      .in('status', ['submitted', 'in_review'])
      .order('submitted_at', { ascending: true });
    setSubmissions((data ?? []) as unknown as Submission[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function selectSubmission(sub: Submission) {
    setSelected(sub);
    setReviewNotes(sub.review_notes ?? '');
    setShowDiff(false);
    setTaskActions([]);
    if (sub.task_id) {
      const { data } = await supabase
        .from('actions')
        .select('id, action_type, before_state, after_state, created_at')
        .eq('target_id', sub.task_id)
        .order('created_at', { ascending: true });
      setTaskActions((data ?? []) as unknown as TaskAction[]);
    }
  }

  async function takeAction(submissionId: string, taskId: string | null, outcome: string) {
    setActioning(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();

    const statusMap: Record<string, string> = {
      approved: 'approved',
      changes_requested: 'changes_requested',
      archived: 'archived',
    };

    const taskStatusMap: Record<string, string> = {
      approved: 'approved',
      changes_requested: 'doing',
      archived: 'archived',
    };

    await supabase.from('submissions').update({
      status: statusMap[outcome],
      review_outcome: outcome,
      review_notes: reviewNotes || null,
      reviewed_by: authUser?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', submissionId);

    if (taskId && taskStatusMap[outcome]) {
      await supabase.from('tasks').update({ kanban_status: taskStatusMap[outcome] }).eq('id', taskId);
    }

    setSelected(null);
    setReviewNotes('');
    await load();
    setActioning(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Link href="/platform" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>Platform</Link>
          <span style={{ color: 'var(--ink-3)' }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--ink)' }}>Review queue</span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
          Review queue
          {submissions.length > 0 && (
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ink-3)', marginLeft: 10 }}>
              {submissions.length} pending
            </span>
          )}
        </h1>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : submissions.length === 0 ? (
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No submissions awaiting review.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap: 16 }}>
          {/* List */}
          <div>
            {submissions.map(sub => (
              <div
                key={sub.id}
                onClick={() => selectSubmission(sub)}
                style={{
                  background: 'var(--white)', borderRadius: 10, border: `1px solid ${selected?.id === sub.id ? 'var(--accent)' : 'var(--border)'}`,
                  padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                  {sub.tasks?.title ?? sub.tasks?.text ?? 'Task'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>
                  {sub.users?.name} · {sub.projects?.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  Submitted {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'recently'}
                </div>
              </div>
            ))}
          </div>

          {/* Detail */}
          {selected && (
            <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '20px 24px', position: 'sticky', top: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>
                    {selected.tasks?.title ?? selected.tasks?.text}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {selected.users?.name} · {selected.projects?.name}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: 18 }}>×</button>
              </div>

              {/* Success criteria */}
              {selected.tasks?.success_criteria?.length ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Success criteria</div>
                  {selected.tasks.success_criteria.map((c, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 4 }}>• {c}</div>
                  ))}
                </div>
              ) : null}

              {/* Narrative */}
              {selected.narrative && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Narrative</div>
                  <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>{selected.narrative}</p>
                </div>
              )}

              {/* Self check */}
              {selected.self_check_results?.score && (
                <div style={{ background: 'var(--card)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Guide self-check</div>
                  <p style={{ fontSize: 12, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>{selected.self_check_results.score}</p>
                </div>
              )}

              {/* Diff summary */}
              {selected.diff_summary?.action_count ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Actions ({selected.diff_summary.action_count})</div>
                  {selected.diff_summary.actions?.slice(0, 5).map((a, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'monospace', marginBottom: 2 }}>• {a}</div>
                  ))}
                </div>
              ) : null}

              {/* Action diff */}
              {taskActions.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      State changes ({taskActions.length})
                    </div>
                    <button
                      onClick={() => setShowDiff(p => !p)}
                      style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                    >
                      {showDiff ? 'Hide diff' : 'Show diff'}
                    </button>
                  </div>
                  {showDiff && taskActions.map((action, i) => (
                    <div key={action.id} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 5, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{action.action_type.replace(/_/g, ' ')}</span>
                        <span>{new Date(action.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <DiffViewer
                        before={action.before_state ?? {}}
                        after={action.after_state ?? {}}
                        labelMap={{ kanban_status: 'status', started_at: 'started' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Video */}
              {selected.video_link && (
                <div style={{ marginBottom: 14 }}>
                  <a href={selected.video_link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>
                    Watch video walkthrough →
                  </a>
                </div>
              )}

              {/* Review notes */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  Your feedback
                </div>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="What did you change, what to improve next time, or why you're archiving this…"
                  rows={4}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => takeAction(selected.id, selected.tasks ? null : null, 'approved')}
                  disabled={actioning}
                  style={{ padding: '10px', background: '#16A34A', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Approve
                </button>
                <button
                  onClick={() => takeAction(selected.id, null, 'changes_requested')}
                  disabled={actioning}
                  style={{ padding: '10px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Request changes
                </button>
                <button
                  onClick={() => takeAction(selected.id, null, 'archived')}
                  disabled={actioning}
                  style={{ padding: '10px', background: 'none', color: 'var(--ink-3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                >
                  Archive with learnings
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
