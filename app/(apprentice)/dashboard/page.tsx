'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
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

function TaskCard({ task, onDragStart }: { task: PlatformTask; onDragStart: (id: string) => void }) {
  const title = task.title ?? task.text;
  const projectName = task.projects?.name;
  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      style={{ marginBottom: 8, cursor: 'grab' }}
    >
      <Link href={`/apprentice-tasks/${task.id}`} style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '12px 14px',
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
    </div>
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
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

  async function handleDrop(targetCol: string) {
    if (!dragId || !targetCol) return;
    const task = tasks.find(t => t.id === dragId);
    if (!task || task.kanban_status === targetCol) { setDragId(null); setDragOver(null); return; }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === dragId ? { ...t, kanban_status: targetCol } : t));
    setDragId(null);
    setDragOver(null);

    const { error } = await supabase
      .from('tasks')
      .update({ kanban_status: targetCol })
      .eq('id', dragId);

    if (error) {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === dragId ? { ...t, kanban_status: task.kanban_status } : t));
    }
  }

  const tasksByColumn = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.kanban_status === col.key);
    return acc;
  }, {} as Record<string, PlatformTask[]>);

  const hasProjects = projects.length > 0;

  const activeTasks = tasks.filter(t => t.kanban_status === 'doing').length;
  const backlogTasks = tasks.filter(t => t.kanban_status === 'backlog').length;
  const inReviewTasks = tasks.filter(t => t.kanban_status === 'in_review').length;
  const approvedTasks = tasks.filter(t => t.kanban_status === 'approved').length;

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.4px', marginBottom: 4 }}>
          Your workspace
        </div>
        <div style={{ fontSize: 13, color: '#64748B' }}>
          {hasProjects
            ? `${projects[0]?.projects?.name ?? 'Project'} · drag cards between columns`
            : 'Waiting for project access from Nick.'}
        </div>
      </div>

      {/* Stats row */}
      {hasProjects && !loading && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'In progress', value: activeTasks, color: activeTasks > 0 ? '#1D4ED8' : undefined, bg: activeTasks > 0 ? '#EFF6FF' : undefined },
            { label: 'Backlog',     value: backlogTasks },
            { label: 'In review',   value: inReviewTasks, color: inReviewTasks > 0 ? '#D97706' : undefined, bg: inReviewTasks > 0 ? '#FEF3C7' : undefined },
            { label: 'Approved',    value: approvedTasks, color: approvedTasks > 0 ? '#16A34A' : undefined, bg: approvedTasks > 0 ? '#DCFCE7' : undefined },
          ].map(s => (
            <div key={s.label} style={{
              padding: '10px 16px', borderRadius: 10,
              background: s.bg ?? '#F8FAFC',
              border: `1px solid ${s.color ? `${s.color}30` : '#E2E8F0'}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: s.color ?? '#64748B', letterSpacing: '-0.3px' }}>{s.value}</span>
              <span style={{ fontSize: 11, color: s.color ?? '#94A3B8', fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

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
            const isDragTarget = dragOver === col.key && dragId !== null;

            const headerAccent: Record<string, string> = {
              doing: '#1D4ED8',
              in_review: '#D97706',
              approved: '#16A34A',
            };
            const accent = headerAccent[col.key] ?? '#94A3B8';

            return (
              <div
                key={col.key}
                style={{ minWidth: 240, width: 240, flexShrink: 0 }}
                onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.key)}
              >
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 10, padding: '0 2px',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {col.label}
                  </span>
                  {colTasks.length > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: isDoingOverloaded ? '#D97706' : accent,
                      background: isDoingOverloaded ? '#FEF3C7' : `${accent}15`,
                      padding: '1px 7px', borderRadius: 10,
                    }}>
                      {colTasks.length}
                    </span>
                  )}
                  {isDoingOverloaded && (
                    <span style={{ fontSize: 10, color: '#D97706', fontWeight: 600 }}>focus</span>
                  )}
                </div>

                {/* Drop zone */}
                <div style={{
                  minHeight: 80, borderRadius: 10,
                  border: isDragTarget ? '2px dashed #1B4332' : '2px solid transparent',
                  background: isDragTarget ? '#F0FDF4' : 'transparent',
                  transition: 'all 0.15s',
                  padding: isDragTarget ? 4 : 0,
                }}>
                  {loading ? (
                    <>{col.key === 'backlog' && <><SkeletonCard /><SkeletonCard /></>}</>
                  ) : colTasks.length === 0 ? (
                    <EmptyColumn colKey={col.key} />
                  ) : (
                    colTasks.map(task => <TaskCard key={task.id} task={task} onDragStart={setDragId} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
