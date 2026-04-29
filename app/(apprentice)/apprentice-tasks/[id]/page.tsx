'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SubmitFlow from '@/components/apprentice/SubmitFlow';

interface PlatformTask {
  id: string;
  title: string | null;
  text: string;
  description: string | null;
  project_id: string | null;
  kanban_status: string;
  due_date: string;
  difficulty: number | null;
  status: string;
  success_criteria: string[] | null;
  resources: { label: string; url: string }[] | null;
  assigned_to: string | null;
  projects?: { id: string; name: string; slug: string } | null;
}

interface Workspace {
  id: string;
}

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  doing: 'In Progress',
  in_review: 'In Review',
  approved: 'Approved',
  archived: 'Archived',
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  backlog: { color: '#64748B', bg: '#F1F5F9' },
  doing: { color: '#1D4ED8', bg: '#EFF6FF' },
  in_review: { color: '#D97706', bg: '#FEF3C7' },
  approved: { color: '#16A34A', bg: '#DCFCE7' },
  archived: { color: '#64748B', bg: '#F1F5F9' },
};

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<PlatformTask | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    setUserId(authUser.id);

    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title, text, description, project_id, kanban_status, due_date, difficulty, status, success_criteria, resources, assigned_to, projects(id, name, slug)')
      .eq('id', params.id)
      .single();

    if (taskData) {
      setTask(taskData as unknown as PlatformTask);

      // Check workspace exists
      if (taskData.project_id) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('project_id', taskData.project_id)
          .single();
        setWorkspace(ws ?? null);
      }
    }
    setLoading(false);
  }, [supabase, params.id]);

  useEffect(() => { load(); }, [load]);

  async function startTask() {
    if (!task || !userId) return;
    setStarting(true);

    // Create workspace if not exists
    let wsId = workspace?.id;
    if (!wsId && task.project_id) {
      const { data: newWs } = await supabase
        .from('workspaces')
        .insert({ user_id: userId, project_id: task.project_id })
        .select('id')
        .single();
      wsId = newWs?.id;
      if (newWs) setWorkspace(newWs);
    }

    // Move task to doing
    const before = { kanban_status: task.kanban_status };
    await supabase
      .from('tasks')
      .update({ kanban_status: 'doing', status: 'active', started_at: new Date().toISOString() })
      .eq('id', task.id);

    // Log action
    await supabase.from('actions').insert({
      user_id: userId,
      project_id: task.project_id,
      workspace_id: wsId,
      action_type: 'task_start',
      target_table: 'tasks',
      target_id: task.id,
      before_state: before,
      after_state: { kanban_status: 'doing' },
      actor_role: 'apprentice',
      reversible: true,
    });

    setTask({ ...task, kanban_status: 'doing' });
    setStarting(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ height: 24, width: 200, background: '#F1F5F9', borderRadius: 6, marginBottom: 16 }} />
        <div style={{ height: 16, width: '80%', background: '#F1F5F9', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 16, width: '60%', background: '#F1F5F9', borderRadius: 4 }} />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ color: '#64748B', fontSize: 14 }}>Task not found.</div>
        <Link href="/dashboard" style={{ color: '#1B4332', fontSize: 13 }}>← Back to dashboard</Link>
      </div>
    );
  }

  const title = task.title ?? task.text;
  const statusStyle = STATUS_COLORS[task.kanban_status] ?? STATUS_COLORS.backlog;

  return (
    <div style={{ padding: 28, maxWidth: 720 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        {task.projects && (
          <>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ fontSize: 13, color: '#64748B' }}>{task.projects.name}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.4px', margin: 0, flex: 1 }}>
            {title}
          </h1>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
            color: statusStyle.color, background: statusStyle.bg, flexShrink: 0,
          }}>
            {STATUS_LABELS[task.kanban_status]}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B' }}>
          <span>Due {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          {task.difficulty && (
            <span>Difficulty: {task.difficulty}/5</span>
          )}
          {task.projects && <span>{task.projects.name}</span>}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Brief
          </div>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>{task.description}</p>
        </div>
      )}

      {/* Success criteria */}
      {task.success_criteria && task.success_criteria.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Success criteria
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {task.success_criteria.map((criterion, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5, border: '2px solid #1B4332',
                  flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {task.kanban_status === 'approved' && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#1B4332" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{criterion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      {task.resources && task.resources.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Resources
          </div>
          {task.resources.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noreferrer"
              style={{ fontSize: 13, color: '#1B4332', textDecoration: 'none', display: 'block', marginBottom: 4 }}>
              → {r.label}
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        {task.kanban_status === 'backlog' && (
          <button
            onClick={startTask}
            disabled={starting}
            style={{
              padding: '10px 20px', background: '#1B4332', color: 'white',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: starting ? 'wait' : 'pointer',
            }}
          >
            {starting ? 'Starting…' : 'Start task'}
          </button>
        )}

        {task.kanban_status === 'doing' && (
          <>
            <button
              onClick={() => setShowSubmit(true)}
              style={{
                padding: '10px 20px', background: '#1B4332', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Submit for review
            </button>
            <Link href="/guide" style={{
              padding: '10px 18px', background: 'white', color: '#1B4332',
              border: '1px solid #1B4332', borderRadius: 8, fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}>
              Ask the Guide
            </Link>
          </>
        )}

        {task.kanban_status === 'in_review' && (
          <div style={{ padding: '10px 16px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 13, color: '#92400E' }}>
            Submitted — Nick reviewing within 48 hours.
          </div>
        )}

        {task.kanban_status === 'approved' && (
          <div style={{ padding: '10px 16px', background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 13, color: '#166534', fontWeight: 600 }}>
            Approved
          </div>
        )}
      </div>

      {/* Submit flow modal */}
      {showSubmit && task && userId && (
        <SubmitFlow
          task={task}
          userId={userId}
          workspaceId={workspace?.id ?? null}
          onClose={() => setShowSubmit(false)}
          onSubmitted={() => {
            setShowSubmit(false);
            setTask({ ...task, kanban_status: 'in_review' });
          }}
        />
      )}
    </div>
  );
}
