'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { saveTaskLocally, getAllLocalTasks, deleteLocalTask, hydrateFromServer, enqueuePendingWrite, syncPendingTasks } from '@/lib/offline/taskStore';
import type { Task, TaskStatus, TaskCategory } from '@/types';

const CATEGORY_COLORS: Record<TaskCategory, { color: string; bg: string; label: string }> = {
  calls:    { color: '#1B4332', bg: '#E8F5EE', label: 'Calls' },
  admin:    { color: '#1E40AF', bg: 'rgba(30,64,175,0.1)', label: 'Admin' },
  training: { color: '#6D28D9', bg: 'rgba(109,40,217,0.1)', label: 'Training' },
  planning: { color: '#B45309', bg: 'rgba(180,83,9,0.1)', label: 'Planning' },
};

const HEART_COLORS = ['', '#FCA5A5', '#F87171', '#EF4444'];

function HeartBadge({ count }: { count: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={HEART_COLORS[count]}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ))}
    </div>
  );
}

function TimerDisplay({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = h > 0
    ? [`${h}h`, `${m.toString().padStart(2,'0')}m`]
    : [`${m}m`, `${s.toString().padStart(2,'0')}s`];
  return <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{parts.join(' ')}</span>;
}

type NewTaskDraft = {
  text: string;
  category: TaskCategory;
  hearts: 1 | 2 | 3;
  estimateMins: number;
};

const DEFAULT_DRAFT: NewTaskDraft = { text: '', category: 'calls', hearts: 2, estimateMins: 30 };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState<NewTaskDraft>(DEFAULT_DRAFT);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({}); // taskId → elapsed seconds
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const timerRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const supabase = createClient();

  // ── Load tasks ───────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setTasks(data as Task[]);
        await hydrateFromServer(data as Task[]);
        return;
      }
    }
    // Offline fallback
    const local = await getAllLocalTasks();
    setTasks(local);
  }, []);

  useEffect(() => {
    loadTasks();

    const on  = async () => {
      setOnline(true);
      // Sync pending writes
      const pending = await syncPendingTasks(
        async (task) => { await supabase.from('tasks').upsert(task); },
        async (id)   => { await supabase.from('tasks').delete().eq('id', id); }
      );
      if (pending > 0) loadTasks();
      setPendingCount(0);
    };
    const off = () => setOnline(false);

    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      Object.values(timerRefs.current).forEach(clearInterval);
    };
  }, [loadTasks]);

  // ── Timer engine ─────────────────────────────────────────
  useEffect(() => {
    // Start timers for any 'active' tasks
    tasks.forEach(task => {
      if (task.status === 'active' && !timerRefs.current[task.id]) {
        const base = task.elapsed_seconds;
        let elapsed = base;
        timerRefs.current[task.id] = setInterval(() => {
          elapsed++;
          setActiveTimers(prev => ({ ...prev, [task.id]: elapsed }));
        }, 1000);
        setActiveTimers(prev => ({ ...prev, [task.id]: base }));
      }
      if (task.status !== 'active' && timerRefs.current[task.id]) {
        clearInterval(timerRefs.current[task.id]);
        delete timerRefs.current[task.id];
      }
    });
  }, [tasks]);

  // ── CRUD ─────────────────────────────────────────────────
  async function addTask() {
    if (!draft.text.trim() || saving) return;
    setSaving(true);

    const now = new Date().toISOString();
    const newTask: Task = {
      id:             crypto.randomUUID(),
      business_id:    'demo-business-id',
      user_id:        'demo-user-id',
      text:           draft.text.trim(),
      category:       draft.category,
      hearts:         draft.hearts,
      estimate_mins:  draft.estimateMins,
      elapsed_seconds: 0,
      status:         'pending',
      due_date:       now.split('T')[0],
      started_at:     null,
      completed_at:   null,
      created_at:     now,
    };

    // Optimistic update
    setTasks(prev => [newTask, ...prev]);
    setDraft(DEFAULT_DRAFT);
    setAdding(false);

    await saveTaskLocally(newTask);

    if (online) {
      const { error } = await supabase.from('tasks').insert(newTask);
      if (error) {
        await enqueuePendingWrite({ type: 'upsert', task: newTask });
        setPendingCount(c => c + 1);
      }
    } else {
      await enqueuePendingWrite({ type: 'upsert', task: newTask });
      setPendingCount(c => c + 1);
    }
    setSaving(false);
  }

  async function updateStatus(task: Task, status: TaskStatus) {
    const now = new Date().toISOString();
    const updated: Task = {
      ...task,
      status,
      started_at:   status === 'active' ? (task.started_at ?? now) : task.started_at,
      completed_at: status === 'done' ? now : task.completed_at,
      elapsed_seconds: status === 'done' ? (activeTimers[task.id] ?? task.elapsed_seconds) : task.elapsed_seconds,
    };

    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    await saveTaskLocally(updated);

    if (online) {
      await supabase.from('tasks').update({
        status: updated.status,
        started_at: updated.started_at,
        completed_at: updated.completed_at,
        elapsed_seconds: updated.elapsed_seconds,
      }).eq('id', updated.id);
    } else {
      await enqueuePendingWrite({ type: 'status', task: updated });
      setPendingCount(c => c + 1);
    }
  }

  async function deleteTask(task: Task) {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    await deleteLocalTask(task.id);
    if (online) {
      await supabase.from('tasks').delete().eq('id', task.id);
    } else {
      await enqueuePendingWrite({ type: 'delete', task });
      setPendingCount(c => c + 1);
    }
  }

  const visible = tasks.filter(t => filter === 'all' || t.status === filter);
  const counts = { pending: tasks.filter(t => t.status === 'pending').length, active: tasks.filter(t => t.status === 'active').length, done: tasks.filter(t => t.status === 'done').length };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>Task Manager</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            {counts.active > 0 ? `${counts.active} active · ` : ''}{counts.pending} pending · {counts.done} done today
            {!online && <span style={{ color: '#B45309', fontWeight: 600 }}> · Offline{pendingCount > 0 ? ` · ${pendingCount} queued` : ''}</span>}
          </div>
        </div>
        <button
          onClick={() => setAdding(true)}
          style={{
            padding: '9px 16px',
            background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add task
        </button>
      </div>

      {/* Add task form */}
      {adding && (
        <div style={{
          background: 'var(--white)', borderRadius: 16, border: '1px solid var(--border)',
          padding: 18, marginBottom: 16, boxShadow: 'var(--shadow-sm)',
        }}>
          <textarea
            autoFocus
            value={draft.text}
            onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
            placeholder="Describe the task…"
            rows={2}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 14, color: 'var(--ink)',
              resize: 'none', outline: 'none', fontFamily: 'inherit',
              marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {/* Category */}
            {(Object.keys(CATEGORY_COLORS) as TaskCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setDraft(d => ({ ...d, category: cat }))}
                style={{
                  padding: '5px 11px',
                  background: draft.category === cat ? CATEGORY_COLORS[cat].bg : 'var(--card)',
                  color: draft.category === cat ? CATEGORY_COLORS[cat].color : 'var(--ink-2)',
                  border: `1px solid ${draft.category === cat ? 'currentColor' : 'var(--border)'}`,
                  borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {CATEGORY_COLORS[cat].label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Hearts */}
            <div style={{ display: 'flex', gap: 4 }}>
              {([1,2,3] as const).map(h => (
                <button
                  key={h}
                  onClick={() => setDraft(d => ({ ...d, hearts: h }))}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: draft.hearts === h ? HEART_COLORS[h] + '22' : 'var(--card)',
                    border: `1px solid ${draft.hearts === h ? HEART_COLORS[h] : 'var(--border)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={draft.hearts >= h ? HEART_COLORS[h] : 'transparent'} stroke={HEART_COLORS[h]} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              ))}
              <span style={{ fontSize: 11, color: 'var(--ink-3)', alignSelf: 'center', marginLeft: 2 }}>Priority</span>
            </div>
            {/* Estimate */}
            <select
              value={draft.estimateMins}
              onChange={e => setDraft(d => ({ ...d, estimateMins: parseInt(e.target.value) }))}
              style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--ink)', background: 'var(--card)', outline: 'none' }}
            >
              {[5,10,15,30,45,60,90,120].map(m => (
                <option key={m} value={m}>{m < 60 ? `${m}m` : `${m/60}h`}</option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setAdding(false); setDraft(DEFAULT_DRAFT); }} style={{ padding: '8px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={addTask} disabled={!draft.text.trim() || saving} style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {(['all','pending','active','done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 14px', background: 'none', border: 'none',
              borderBottom: `2px solid ${filter === f ? 'var(--accent)' : 'transparent'}`,
              color: filter === f ? 'var(--accent)' : 'var(--ink-2)',
              fontSize: 12, fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? `All (${tasks.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f as TaskStatus] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Task list */}
      {visible.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          {filter === 'done' ? 'No completed tasks yet.' : 'No tasks — add one above.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(task => {
            const cat = CATEGORY_COLORS[task.category];
            const elapsed = activeTimers[task.id] ?? task.elapsed_seconds;
            const estimateSec = task.estimate_mins * 60;
            const progress = Math.min(1, elapsed / Math.max(estimateSec, 1));
            const overrun  = elapsed > estimateSec;

            return (
              <div
                key={task.id}
                style={{
                  background: 'var(--white)', borderRadius: 14,
                  border: `1px solid ${task.status === 'active' ? 'var(--accent-light)' : 'var(--border)'}`,
                  padding: '14px 16px',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Active progress bar */}
                {task.status === 'active' && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0,
                    height: 3,
                    width: `${progress * 100}%`,
                    background: overrun ? 'var(--rose)' : 'var(--accent)',
                    transition: 'width 1s linear',
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Status circle */}
                  <button
                    onClick={() => {
                      if (task.status === 'pending') updateStatus(task, 'active');
                      else if (task.status === 'active') updateStatus(task, 'done');
                    }}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${task.status === 'done' ? 'var(--accent)' : task.status === 'active' ? 'var(--accent)' : 'var(--border)'}`,
                      background: task.status === 'done' ? 'var(--accent)' : 'transparent',
                      cursor: task.status === 'done' ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                      marginTop: 1,
                    }}
                  >
                    {task.status === 'done' && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {task.status === 'active' && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}/>
                    )}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: task.status === 'done' ? 'var(--ink-3)' : 'var(--ink)',
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      marginBottom: 6, lineHeight: 1.4,
                    }}>
                      {task.text}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Category chip */}
                      <span style={{
                        padding: '2px 8px', borderRadius: 20,
                        background: cat.bg, color: cat.color,
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {cat.label}
                      </span>

                      {/* Hearts */}
                      <HeartBadge count={task.hearts} />

                      {/* Timer / estimate */}
                      {task.status === 'active' && (
                        <span style={{ color: overrun ? 'var(--rose)' : 'var(--ink-2)' }}>
                          <TimerDisplay seconds={elapsed} />
                          <span style={{ color: 'var(--ink-3)', fontSize: 11 }}> / {task.estimate_mins}m est.</span>
                        </span>
                      )}
                      {task.status === 'done' && task.elapsed_seconds > 0 && (
                        <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>
                          <TimerDisplay seconds={task.elapsed_seconds} />
                        </span>
                      )}
                      {task.status === 'pending' && (
                        <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{task.estimate_mins}m est.</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {task.status === 'active' && (
                      <button
                        onClick={() => updateStatus(task, 'pending')}
                        style={{ padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--ink-2)', cursor: 'pointer' }}
                      >
                        Pause
                      </button>
                    )}
                    {task.status === 'active' && (
                      <button
                        onClick={() => updateStatus(task, 'done')}
                        style={{ padding: '4px 10px', background: 'var(--accent-light)', border: 'none', borderRadius: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Done
                      </button>
                    )}
                    <button
                      onClick={() => deleteTask(task)}
                      style={{ padding: '4px 8px', background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', borderRadius: 6, fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
