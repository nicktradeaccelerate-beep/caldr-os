'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SubmitFlow from '@/components/apprentice/SubmitFlow';
import GuidePanel from '@/components/apprentice/GuidePanel';
import ThreeColumnWorkSurface from '@/components/shared/ThreeColumnWorkSurface';

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

// BFB Mayfair palette — editorial identity
const BFB = {
  bg: '#F5F0E8',
  card: '#FDFAF4',
  border: '#D4C5A9',
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'IM Fell English', Georgia, serif",
  mono: "'Courier Prime', 'Courier New', monospace",
  gold: '#B8941F',
  obsidian: '#1A1A1A',
  oxblood: '#722F37',
  muted: '#6B5E4A',
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
  const [narrative, setNarrative] = useState('');
  const [selfChecking, setSelfChecking] = useState(false);
  const [selfCheckResult, setSelfCheckResult] = useState<{ assessment: string; readiness: number } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push('/login'); return; }
    setUserId(authUser.id);

    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title, text, description, project_id, kanban_status, due_date, difficulty, status, success_criteria, resources, assigned_to, projects(id, name, slug)')
      .eq('id', params.id)
      .single();

    if (taskData) {
      setTask(taskData as unknown as PlatformTask);
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
  }, [supabase, params.id, router]);

  useEffect(() => { load(); }, [load]);

  async function runSelfCheck() {
    if (!task || !userId || !narrative.trim()) return;
    setSelfChecking(true);
    setSelfCheckResult(null);
    try {
      const res = await fetch('/api/guide/self-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: task.title ?? task.text,
          successCriteria: task.success_criteria ?? [],
          narrative: narrative.trim(),
          userId,
        }),
      });
      const data = await res.json() as { assessment?: string; readiness?: number; error?: string };
      setSelfCheckResult({ assessment: data.assessment ?? data.error ?? 'Check failed.', readiness: data.readiness ?? 0 });
    } catch {
      setSelfCheckResult({ assessment: 'Connection error — try again.', readiness: 0 });
    }
    setSelfChecking(false);
  }

  async function startTask() {
    if (!task || !userId) return;
    setStarting(true);

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

    const before = { kanban_status: task.kanban_status };
    await supabase
      .from('tasks')
      .update({ kanban_status: 'doing', status: 'active', started_at: new Date().toISOString() })
      .eq('id', task.id);

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

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 600 }}>
        {[200, '80%', '60%', '40%'].map((w, i) => (
          <div key={i} style={{ height: i === 0 ? 28 : 16, width: w, background: '#F1F5F9', borderRadius: 6, marginBottom: 14, animation: 'pulse 1.5s infinite' }} />
        ))}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: '#64748B', fontSize: 14, marginBottom: 12 }}>Task not found.</p>
        <Link href="/dashboard" style={{ color: '#1B4332', fontSize: 13 }}>← Back to dashboard</Link>
      </div>
    );
  }

  const title = task.title ?? task.text;
  const isBfb = task.projects?.slug === 'bfb';
  const statusStyle = STATUS_COLORS[task.kanban_status] ?? STATUS_COLORS.backlog;

  // ─── Top toolbar ─────────────────────────────────────────────────────────────
  const toolbar = (
    <div style={{ padding: '0 20px', height: 44, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <Link href="/dashboard" style={{ color: '#64748B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Dashboard
      </Link>
      {task.projects && (
        <>
          <span style={{ color: '#CBD5E1' }}>/</span>
          <span style={{ color: '#64748B' }}>{task.projects.name}</span>
        </>
      )}
      <span style={{ color: '#CBD5E1' }}>/</span>
      <span style={{ color: '#0F172A', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{title}</span>
      <div style={{ marginLeft: 'auto' }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, color: statusStyle.color, background: statusStyle.bg }}>
          {STATUS_LABELS[task.kanban_status]}
        </span>
      </div>
    </div>
  );

  // ─── Left rail: task context ─────────────────────────────────────────────────
  const leftRail = (
    <div style={{ padding: '20px 18px', background: isBfb ? BFB.card : 'white', minHeight: '100%' }}>
      {/* Title + meta */}
      <h2 style={{
        fontSize: isBfb ? 22 : 17,
        fontWeight: isBfb ? 400 : 700,
        color: isBfb ? BFB.obsidian : '#0F172A',
        fontFamily: isBfb ? BFB.heading : 'inherit',
        letterSpacing: isBfb ? '0.01em' : '-0.3px',
        margin: '0 0 10px', lineHeight: 1.25,
      }}>
        {title}
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: 11, color: isBfb ? BFB.muted : '#64748B', fontFamily: isBfb ? BFB.body : 'inherit', marginBottom: 18 }}>
        <span>Due {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        {task.difficulty && <span>Difficulty {task.difficulty}/5</span>}
        {task.projects && <span>{task.projects.name}</span>}
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${isBfb ? BFB.border : '#F1F5F9'}`, margin: '0 0 18px' }} />

      {/* Brief */}
      {task.description && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: isBfb ? BFB.gold : '#94A3B8', marginBottom: 8, fontFamily: isBfb ? BFB.heading : 'inherit' }}>
            Brief
          </div>
          <p style={{ fontSize: isBfb ? 13.5 : 12, color: isBfb ? BFB.obsidian : '#374151', lineHeight: 1.85, margin: 0, fontFamily: isBfb ? BFB.body : 'inherit' }}>
            {task.description}
          </p>
        </div>
      )}

      {/* Success criteria */}
      {task.success_criteria && task.success_criteria.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: isBfb ? BFB.gold : '#94A3B8', marginBottom: 10, fontFamily: isBfb ? BFB.heading : 'inherit' }}>
            Criteria
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {task.success_criteria.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <div style={{
                  width: 16, height: 16, borderRadius: isBfb ? 2 : 4, flexShrink: 0, marginTop: 2,
                  border: `1.5px solid ${isBfb ? BFB.gold : '#1B4332'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: task.kanban_status === 'approved' ? (isBfb ? BFB.gold : '#1B4332') : 'transparent',
                }}>
                  {task.kanban_status === 'approved' && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: isBfb ? 13 : 12, color: isBfb ? BFB.obsidian : '#374151', lineHeight: 1.65, fontFamily: isBfb ? BFB.body : 'inherit' }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      {task.resources && task.resources.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: isBfb ? BFB.gold : '#94A3B8', marginBottom: 10, fontFamily: isBfb ? BFB.heading : 'inherit' }}>
            References
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {task.resources.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: isBfb ? BFB.gold : '#1B4332', textDecoration: 'none', display: 'flex', gap: 6, alignItems: 'center', fontFamily: isBfb ? BFB.body : 'inherit' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {r.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Centre: work area ───────────────────────────────────────────────────────
  const centre = (
    <div style={{ padding: '28px 28px', maxWidth: 680 }}>

      {/* Backlog — start task CTA */}
      {task.kanban_status === 'backlog' && (
        <div>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{
              fontSize: isBfb ? 20 : 15,
              fontWeight: isBfb ? 400 : 700,
              color: isBfb ? BFB.obsidian : '#0F172A',
              fontFamily: isBfb ? BFB.heading : 'inherit',
              margin: '0 0 10px',
              letterSpacing: isBfb ? '0.01em' : '-0.2px',
            }}>
              {isBfb ? 'Read the brief carefully.' : 'Ready to start?'}
            </h3>
            <p style={{ fontSize: isBfb ? 14 : 13, color: isBfb ? BFB.muted : '#64748B', lineHeight: 1.8, margin: 0, fontFamily: isBfb ? BFB.body : 'inherit' }}>
              {isBfb
                ? 'Review each criterion on the left. When you are satisfied you understand the scope, begin the task.'
                : 'Review the brief and success criteria on the left. When you\'re ready, start the task — it\'ll move to your active work.'
              }
            </p>
          </div>
          <button
            onClick={startTask}
            disabled={starting}
            style={{
              padding: isBfb ? '10px 28px' : '10px 22px',
              background: isBfb ? BFB.obsidian : '#1B4332',
              color: isBfb ? BFB.bg : 'white',
              border: isBfb ? `1px solid ${BFB.obsidian}` : 'none',
              borderRadius: isBfb ? 2 : 8,
              fontSize: isBfb ? 11 : 13,
              fontWeight: 600,
              letterSpacing: isBfb ? '0.12em' : 'normal',
              textTransform: isBfb ? 'uppercase' : 'none',
              fontFamily: isBfb ? BFB.heading : 'inherit',
              cursor: starting ? 'wait' : 'pointer',
              transition: 'opacity 0.15s',
              opacity: starting ? 0.7 : 1,
            }}
          >
            {starting ? 'Beginning…' : isBfb ? 'Begin' : 'Start task →'}
          </button>
        </div>
      )}

      {/* Doing — self-check + submission */}
      {task.kanban_status === 'doing' && (
        <div>
          <h3 style={{
            fontSize: isBfb ? 20 : 15,
            fontWeight: isBfb ? 400 : 700,
            color: isBfb ? BFB.obsidian : '#0F172A',
            margin: '0 0 8px',
            fontFamily: isBfb ? BFB.heading : 'inherit',
            letterSpacing: isBfb ? '0.01em' : '-0.2px',
          }}>
            {isBfb ? 'Your submission' : 'Your work'}
          </h3>
          <p style={{ fontSize: isBfb ? 14 : 13, color: isBfb ? BFB.muted : '#64748B', lineHeight: 1.8, margin: '0 0 20px', fontFamily: isBfb ? BFB.body : 'inherit' }}>
            {isBfb
              ? 'Describe what you have completed and how it satisfies each criterion. The Guide will assess it before you submit.'
              : 'Describe what you\'ve built or completed. The Guide will score it against the success criteria — then you can submit.'
            }
          </p>

          <textarea
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            placeholder={isBfb ? 'Set out your approach and what you have produced…' : 'Describe what you did and how it meets each criterion…'}
            rows={6}
            style={{
              width: '100%', padding: '12px 14px', fontSize: isBfb ? 13.5 : 13,
              border: `1px solid ${isBfb ? BFB.border : '#E2E8F0'}`,
              borderRadius: isBfb ? 2 : 10,
              resize: 'vertical',
              fontFamily: isBfb ? BFB.body : 'inherit',
              background: isBfb ? BFB.card : '#FAFAFA',
              color: isBfb ? BFB.obsidian : '#0F172A',
              lineHeight: 1.8,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={runSelfCheck}
              disabled={!narrative.trim() || selfChecking}
              style={{
                padding: '8px 18px',
                background: isBfb ? 'transparent' : '#1B4332',
                color: isBfb ? BFB.gold : 'white',
                border: `1px solid ${isBfb ? BFB.gold : 'transparent'}`,
                borderRadius: isBfb ? 2 : 7,
                fontSize: isBfb ? 10 : 12,
                fontWeight: 600,
                letterSpacing: isBfb ? '0.1em' : 'normal',
                textTransform: isBfb ? 'uppercase' : 'none',
                fontFamily: isBfb ? BFB.heading : 'inherit',
                cursor: !narrative.trim() || selfChecking ? 'not-allowed' : 'pointer',
                opacity: !narrative.trim() || selfChecking ? 0.5 : 1,
              }}
            >
              {selfChecking ? 'Assessing…' : isBfb ? 'Request assessment' : 'Run self-check'}
            </button>
            {selfCheckResult && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: selfCheckResult.readiness >= 4
                  ? '#16A34A'
                  : selfCheckResult.readiness >= 3
                    ? (isBfb ? BFB.gold : '#D97706')
                    : (isBfb ? BFB.oxblood : '#DC2626'),
                fontFamily: isBfb ? BFB.heading : 'inherit',
                letterSpacing: isBfb ? '0.05em' : 'normal',
              }}>
                Readiness {selfCheckResult.readiness}/5
              </span>
            )}
          </div>

          {selfCheckResult && (
            <div style={{
              marginTop: 16, padding: '14px 16px',
              background: isBfb ? BFB.card : 'white',
              borderRadius: isBfb ? 2 : 10,
              border: `1px solid ${isBfb ? BFB.border : '#E2E8F0'}`,
              borderLeft: isBfb ? `3px solid ${BFB.gold}` : undefined,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: isBfb ? BFB.gold : '#94A3B8', marginBottom: 8, fontFamily: isBfb ? BFB.heading : 'inherit' }}>
                Assessment
              </div>
              <p style={{ fontSize: isBfb ? 13.5 : 12, color: isBfb ? BFB.obsidian : '#374151', lineHeight: 1.85, margin: 0, whiteSpace: 'pre-wrap', fontFamily: isBfb ? BFB.body : 'inherit' }}>
                {selfCheckResult.assessment}
              </p>
            </div>
          )}

          {selfCheckResult && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setShowSubmit(true)}
                style={{
                  padding: isBfb ? '10px 28px' : '10px 22px',
                  background: isBfb ? BFB.obsidian : '#1B4332',
                  color: isBfb ? BFB.bg : 'white',
                  border: 'none',
                  borderRadius: isBfb ? 2 : 8,
                  fontSize: isBfb ? 11 : 13,
                  fontWeight: 600,
                  letterSpacing: isBfb ? '0.12em' : 'normal',
                  textTransform: isBfb ? 'uppercase' : 'none',
                  fontFamily: isBfb ? BFB.heading : 'inherit',
                  cursor: 'pointer',
                }}
              >
                {isBfb ? 'Submit for review' : 'Submit for review →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* In review */}
      {task.kanban_status === 'in_review' && (
        <div style={{
          padding: '16px 20px',
          background: isBfb ? BFB.card : '#FEF3C7',
          border: `1px solid ${isBfb ? BFB.border : '#FDE68A'}`,
          borderLeft: isBfb ? `3px solid ${BFB.gold}` : undefined,
          borderRadius: isBfb ? 2 : 10,
          fontSize: 13,
          color: isBfb ? BFB.obsidian : '#92400E',
          maxWidth: 400,
          fontFamily: isBfb ? BFB.body : 'inherit',
        }}>
          <div style={{ fontWeight: isBfb ? 400 : 700, marginBottom: 4, fontFamily: isBfb ? BFB.heading : 'inherit', fontSize: isBfb ? 16 : 13, letterSpacing: isBfb ? '0.01em' : 'normal' }}>
            {isBfb ? 'Submitted.' : 'Submitted — under review'}
          </div>
          <div style={{ opacity: 0.75, lineHeight: 1.7 }}>
            {isBfb ? 'Your submission is with Nick for review. You will be notified when feedback is available.' : 'Nick will review within 48 hours. Check back here for feedback.'}
          </div>
        </div>
      )}

      {/* Approved */}
      {task.kanban_status === 'approved' && (
        <div style={{
          padding: '16px 20px',
          background: isBfb ? BFB.card : '#DCFCE7',
          border: `1px solid ${isBfb ? BFB.border : '#BBF7D0'}`,
          borderLeft: isBfb ? `3px solid ${BFB.gold}` : undefined,
          borderRadius: isBfb ? 2 : 10,
          maxWidth: 400,
          fontFamily: isBfb ? BFB.body : 'inherit',
        }}>
          <div style={{ fontSize: isBfb ? 16 : 14, fontWeight: isBfb ? 400 : 700, color: isBfb ? BFB.obsidian : '#166534', marginBottom: 4, fontFamily: isBfb ? BFB.heading : 'inherit', letterSpacing: isBfb ? '0.01em' : 'normal' }}>
            {isBfb ? 'Approved.' : 'Approved'}
          </div>
          <div style={{ fontSize: 13, color: isBfb ? BFB.muted : '#166534', opacity: isBfb ? 1 : 0.85, lineHeight: 1.7 }}>
            {isBfb ? 'All criteria satisfied.' : 'All criteria met. Well done.'}
          </div>
        </div>
      )}
    </div>
  );

  // ─── Right panel: Guide ──────────────────────────────────────────────────────
  const rightPanel = (
    <GuidePanel pathTaskId={params.id} embedded />
  );

  return (
    <>
      {isBfb && (
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=IM+Fell+English:ital@0;1&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap"
        />
      )}
      <ThreeColumnWorkSurface
        leftRail={leftRail}
        centre={centre}
        rightPanel={rightPanel}
        leftBg={isBfb ? BFB.card : 'white'}
        centreBg={isBfb ? BFB.bg : '#F8FAFC'}
        storageKey="task-detail"
        topToolbar={toolbar}
      />

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
    </>
  );
}
