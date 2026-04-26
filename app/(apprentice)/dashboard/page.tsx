'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface PlatformTask {
  id: string;
  title: string | null;
  text: string;
  project_id: string | null;
  kanban_status: string;
  due_date: string;
  difficulty: number | null;
  status: string;
  projects?: { name: string; slug: string } | null;
  success_criteria?: string[] | null;
}

interface ProjectAccess {
  project_id: string;
  projects: { name: string; slug: string } | null;
}

const COLUMNS: { key: string; label: string }[] = [
  { key: 'backlog',   label: 'Backlog'    },
  { key: 'doing',     label: 'Doing'      },
  { key: 'in_review', label: 'In Review'  },
  { key: 'approved',  label: 'Approved'   },
  { key: 'archived',  label: 'Archived'   },
];

function DueBadge({ due }: { due: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due);
  const diff = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
  const color = diff < 0 ? '#DC2626' : diff <= 2 ? '#D97706' : '#16A34A';
  const label = diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Due today' : `${diff}d`;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}15`, padding: '2px 6px', borderRadius: 4 }}>
      {label}
    </span>
  );
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: i <= level ? '#1B4332' : '#E2E8F0',
        }} />
      ))}
    </div>
  );
}

function TaskCard({ task }: { task: PlatformTask }) {
  const title = task.title ?? task.text;
  const projectName = task.projects?.name;
  return (
    <Link href={`/apprentice/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#CBD5E1';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0';
        }}
      >
        {projectName && (
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#1B4332',
            background: '#DCFCE7', padding: '2px 7px', borderRadius: 4,
            display: 'inline-block', marginBottom: 6, letterSpacing: '0.04em',
          }}>
            {projectName}
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8, lineHeight: 1.35 }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <DueBadge due={task.due_date} />
          <DifficultyDots level={task.difficulty ?? 2} />
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'white', border: '1px solid #E2E8F0', borderRadius: 10,
      padding: '12px 14px', marginBottom: 8,
    }}>
      <div style={{ height: 10, width: '60%', background: '#F1F5F9', borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 13, width: '90%', background: '#F1F5F9', borderRadius: 4, marginBottom: 6 }} />
      <div style={{ height: 10, width: '40%', background: '#F1F5F9', borderRadius: 4 }} />
    </div>
  );
}

function EmptyColumn({ colKey }: { colKey: string }) {
  const messages: Record<string, string> = {
    backlog: "Nick hasn't assigned any tasks yet — they'll appear here when he does.",
    doing: 'Pick a task from Backlog and start it to move it here.',
    in_review: 'Submit a completed task to move it here for review.',
    approved: 'Approved work will appear here.',
    archived: 'Archived tasks will appear here.',
  };
  return (
    <div style={{
      padding: '20px 14px',
      background: '#F8FAFC',
      borderRadius: 10,
      border: '1px dashed #CBD5E1',
      fontSize: 12,
      color: '#94A3B8',
      lineHeight: 1.5,
      textAlign: 'center',
    }}>
      {messages[colKey] ?? 'No tasks here yet.'}
    </div>
  );
}

export default function ApprenticeDashboard() {
  const [tasks, setTasks] = useState<PlatformTask[]>([]);
  const [projects, setProjects] = useState<ProjectAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    setUserId(authUser.id);

    // Load accessible projects
    const { data: accessData } = await supabase
      .from('project_access')
      .select('project_id, projects(name, slug)')
      .eq('user_id', authUser.id)
      .in('access_level', ['read', 'sandbox', 'contribute']);

    setProjects((accessData ?? []) as unknown as ProjectAccess[]);

    if (!accessData?.length) { setLoading(false); return; }

    const projectIds = accessData.map((a: { project_id: string }) => a.project_id);

    // Load tasks for these projects
    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title, text, project_id, kanban_status, due_date, difficulty, status, projects(name, slug), success_criteria')
      .in('project_id', projectIds)
      .or(`assigned_to.eq.${authUser.id},assigned_to.is.null`)
      .order('due_date', { ascending: true });

    setTasks((taskData ?? []) as unknown as PlatformTask[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const tasksByColumn = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.kanban_status === col.key);
    return acc;
  }, {} as Record<string, PlatformTask[]>);

  const hasProjects = projects.length > 0;

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.4px', marginBottom: 4 }}>
          Your workspace
        </div>
        <div style={{ fontSize: 13, color: '#64748B' }}>
          {hasProjects
            ? `${tasks.filter(t => t.kanban_status === 'doing').length} in progress · ${tasks.filter(t => t.kanban_status === 'backlog').length} in backlog`
            : 'Waiting for project access from Nick.'}
        </div>
      </div>

      {!hasProjects && !loading ? (
        <div style={{
          background: 'white', borderRadius: 14, border: '1px solid #E2E8F0',
          padding: '40px 32px', textAlign: 'center', maxWidth: 480,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🗂</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            No projects assigned yet
          </div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
            Nick assigns projects to your workspace. Once he does, you'll see your tasks here in a Kanban board.
            Your Guide chat is available while you wait.
          </div>
          <Link href="/guide" style={{
            display: 'inline-block', marginTop: 16,
            padding: '9px 18px', background: '#1B4332', color: 'white',
            borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            Open Guide
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
          {COLUMNS.map(col => {
            const colTasks = tasksByColumn[col.key] ?? [];
            const isDoingOverloaded = col.key === 'doing' && colTasks.length >= 3;
            return (
              <div key={col.key} style={{ minWidth: 240, width: 240, flexShrink: 0 }}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 12, padding: '0 2px',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: '0.02em' }}>
                    {col.label}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: isDoingOverloaded ? '#D97706' : '#94A3B8',
                    background: isDoingOverloaded ? '#FEF3C7' : '#F1F5F9',
                    padding: '1px 7px', borderRadius: 10,
                  }}>
                    {colTasks.length}
                  </span>
                  {isDoingOverloaded && (
                    <span style={{ fontSize: 10, color: '#D97706' }}>Focus up</span>
                  )}
                </div>

                {/* Tasks */}
                {loading ? (
                  <>
                    {col.key === 'backlog' && <><SkeletonCard /><SkeletonCard /></>}
                  </>
                ) : colTasks.length === 0 ? (
                  <EmptyColumn colKey={col.key} />
                ) : (
                  colTasks.map(task => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
