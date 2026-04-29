'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Project {
  id: string;
  name: string;
  slug: string;
  module_type: string;
  description: string | null;
  created_at: string;
}

interface ProjectAccess {
  access_level: string;
}

interface PlatformTask {
  id: string;
  title: string | null;
  text: string;
  description: string | null;
  kanban_status: string;
  due_date: string | null;
  difficulty: number | null;
  status: string;
  assigned_to: string | null;
  success_criteria: string[] | null;
  resources: { label: string; url: string }[] | null;
}

interface TeachingVariant {
  id: string;
  status: string;
  generated_at: string;
  is_active: boolean;
  voice_profile: Record<string, string>;
}

const KANBAN_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  backlog:   { color: '#64748B', bg: '#F1F5F9', label: 'Backlog'    },
  doing:     { color: '#1D4ED8', bg: '#EFF6FF', label: 'In Progress' },
  in_review: { color: '#D97706', bg: '#FEF3C7', label: 'In Review'  },
  approved:  { color: '#16A34A', bg: '#DCFCE7', label: 'Approved'   },
  archived:  { color: '#64748B', bg: '#F1F5F9', label: 'Archived'   },
};

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

const MODULE_LABELS: Record<string, string> = {
  bfb: 'Back From Black',
};

const MODULE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  bfb: { bg: '#F0FDF4', color: '#1B4332', border: '#BBF7D0' },
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [access, setAccess] = useState<ProjectAccess | null>(null);
  const [tasks, setTasks] = useState<PlatformTask[]>([]);
  const [teaching, setTeaching] = useState<TeachingVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/login'); return; }
    setUserId(authUser.id);

    const [projRes, accessRes, tasksRes, teachingRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, slug, module_type, description, created_at')
        .eq('id', params.id)
        .single(),
      supabase
        .from('project_access')
        .select('access_level')
        .eq('project_id', params.id)
        .eq('user_id', authUser.id)
        .single(),
      supabase
        .from('tasks')
        .select('id, title, text, description, kanban_status, due_date, difficulty, status, assigned_to, success_criteria, resources')
        .eq('project_id', params.id)
        .or(`assigned_to.eq.${authUser.id},assigned_to.is.null`)
        .neq('kanban_status', 'archived')
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('teaching_masterprompts')
        .select('id, status, generated_at, is_active, voice_profile')
        .eq('product_id', params.id)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    if (!projRes.data || !accessRes.data) {
      router.push('/dashboard');
      return;
    }

    setProject(projRes.data as Project);
    setAccess(accessRes.data as ProjectAccess);
    setTasks((tasksRes.data ?? []) as PlatformTask[]);
    setTeaching(teachingRes.data as TeachingVariant | null);
    setLoading(false);
  }, [supabase, params.id, router]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ padding: '48px 32px', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
    );
  }

  if (!project || !access) return null;

  const moduleStyle = MODULE_COLORS[project.module_type] ?? { bg: '#F8FAFC', color: '#1B4332', border: '#E2E8F0' };
  const tasksByStatus = KANBAN_COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.kanban_status === col.key),
  }));
  const activeTasks = tasks.filter(t => !['archived'].includes(t.kanban_status));

  return (
    <div style={{ padding: '36px 32px', maxWidth: 900 }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: 12, color: '#94A3B8' }}>
        <Link href="/dashboard" style={{ color: '#94A3B8', textDecoration: 'none' }}>Dashboard</Link>
        <span>/</span>
        <span style={{ color: '#475569' }}>{project.name}</span>
      </div>

      {/* Project header */}
      <div style={{
        background: moduleStyle.bg,
        border: `1px solid ${moduleStyle.border}`,
        borderRadius: 14,
        padding: '28px 32px',
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: moduleStyle.color, background: `${moduleStyle.color}18`,
                padding: '3px 8px', borderRadius: 4,
              }}>
                {project.module_type.toUpperCase()}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#64748B', background: '#F1F5F9', padding: '3px 8px', borderRadius: 4,
              }}>
                {access.access_level}
              </span>
            </div>

            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 34,
              fontWeight: 600,
              color: '#0F172A',
              margin: '0 0 10px',
              lineHeight: 1.15,
            }}>
              {project.name}
            </h1>

            {project.description && (
              <p style={{ fontSize: 13, color: '#475569', margin: 0, maxWidth: 520, lineHeight: 1.6 }}>
                {project.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
            <Link
              href="/guide"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', background: '#1B4332', color: 'white',
                borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z"
                  stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
              </svg>
              Open Guide
            </Link>

            {teaching && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#16A34A' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                Teaching variant active
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 20, marginTop: 20, paddingTop: 20,
          borderTop: `1px solid ${moduleStyle.border}`,
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{activeTasks.length}</div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Active tasks</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#16A34A' }}>
              {tasks.filter(t => t.kanban_status === 'approved').length}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Approved</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1D4ED8' }}>
              {tasks.filter(t => t.kanban_status === 'doing').length}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>In progress</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#D97706' }}>
              {tasks.filter(t => t.kanban_status === 'in_review').length}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>In review</div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Your tasks
          </h2>
          <Link
            href="/dashboard"
            style={{ fontSize: 11, color: '#64748B', textDecoration: 'none' }}
          >
            View Kanban board →
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <div style={{
            background: 'white', border: '1px solid #E2E8F0', borderRadius: 12,
            padding: '40px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
              No active tasks yet
            </div>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              Your tasks for this project will appear here once assigned.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeTasks.map(task => {
              const title = task.title ?? task.text;
              const status = KANBAN_COLORS[task.kanban_status] ?? KANBAN_COLORS.backlog;
              return (
                <Link
                  key={task.id}
                  href={`/apprentice-tasks/${task.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)';
                      el.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.boxShadow = 'none';
                      el.style.borderColor = '#E2E8F0';
                    }}
                  >
                    {/* Status dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: status.color, marginTop: 4,
                    }} />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: '#0F172A',
                        marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {title}
                      </div>

                      {task.description && (
                        <div style={{
                          fontSize: 11, color: '#64748B', marginBottom: 6,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {task.description}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: status.color,
                          background: status.bg, padding: '2px 7px', borderRadius: 4,
                        }}>
                          {status.label}
                        </span>

                        {task.difficulty !== null && (
                          <DifficultyDots level={task.difficulty} />
                        )}

                        {task.due_date && <DueBadge due={task.due_date} />}

                        {task.success_criteria && task.success_criteria.length > 0 && (
                          <span style={{ fontSize: 10, color: '#94A3B8' }}>
                            {task.success_criteria.length} criteria
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div style={{ color: '#CBD5E1', flexShrink: 0, paddingTop: 2 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Teaching variant section */}
      {teaching && (
        <div style={{
          marginTop: 28,
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Guide — teaching variant
            </h3>
            <span style={{ fontSize: 10, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
              Active
            </span>
          </div>

          <p style={{ fontSize: 12, color: '#475569', margin: '0 0 14px', lineHeight: 1.6 }}>
            The Guide for this project is trained in Nick&apos;s voice for {project.name} methodology.
            It will ground all advice in the product approach and push back on anything that doesn&apos;t hold up.
          </p>

          {Object.keys(teaching.voice_profile).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {Object.entries(teaching.voice_profile).slice(0, 3).map(([key, value]) => (
                <div key={key} style={{ fontSize: 11, color: '#64748B' }}>
                  <span style={{ fontWeight: 600, color: '#475569', textTransform: 'capitalize', marginRight: 6 }}>
                    {key.replace(/_/g, ' ')}:
                  </span>
                  {String(value).length > 120 ? `${String(value).slice(0, 120)}…` : String(value)}
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: '#94A3B8' }}>
            Generated {new Date(teaching.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>

          <Link
            href="/guide"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
              fontSize: 12, fontWeight: 600, color: '#1B4332', textDecoration: 'none',
            }}
          >
            Open Guide for {project.name} →
          </Link>
        </div>
      )}
    </div>
  );
}

const KANBAN_COLUMNS = [
  { key: 'backlog',   label: 'Backlog'     },
  { key: 'doing',     label: 'In Progress' },
  { key: 'in_review', label: 'In Review'   },
  { key: 'approved',  label: 'Approved'    },
];
