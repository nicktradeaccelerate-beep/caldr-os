'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Message { role: 'user' | 'assistant'; content: string; }
interface BudgetCtx { used: number; total: number; pct: number; }
interface TaskCtx { id: string; title: string | null; text: string; project_id: string | null; }

const STUCK_MS = 30 * 60 * 1000;

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, padding: '3px 8px', borderRadius: 20, border: `1px solid ${color}22`, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

export default function GuidePanel({ pathTaskId, embedded = false }: { pathTaskId?: string; embedded?: boolean }) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskCtx | null>(null);
  const [budget, setBudget] = useState<BudgetCtx | null>(null);
  const [sessionStart] = useState(Date.now());
  const [elapsed, setElapsed] = useState('0m');
  const [showStuck, setShowStuck] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [lastProgress, setLastProgress] = useState(Date.now());
  const [escalated, setEscalated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const loadCtx = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    setUserId(authUser.id);

    const { data: accessData } = await supabase
      .from('project_access')
      .select('project_id')
      .eq('user_id', authUser.id)
      .in('access_level', ['sandbox', 'contribute'])
      .limit(1)
      .single();

    if (accessData) {
      setProjectId(accessData.project_id);

      // Use pathTaskId if provided (task detail page), else find active doing task
      if (pathTaskId) {
        const { data: t } = await supabase
          .from('tasks')
          .select('id, title, text, project_id')
          .eq('id', pathTaskId)
          .single();
        if (t) setActiveTask(t as TaskCtx);
      } else {
        const { data: t } = await supabase
          .from('tasks')
          .select('id, title, text, project_id')
          .eq('project_id', accessData.project_id)
          .eq('kanban_status', 'doing')
          .limit(1)
          .single();
        if (t) setActiveTask(t as TaskCtx);
      }
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [{ data: budgetData }, { data: usageData }] = await Promise.all([
      supabase.from('user_budgets').select('monthly_budget_gbp').eq('user_id', authUser.id).single(),
      supabase.from('api_usage_log').select('api_cost_gbp').eq('user_id', authUser.id).gte('created_at', monthStart),
    ]);
    if (budgetData) {
      const total = Number(budgetData.monthly_budget_gbp);
      const used = (usageData ?? []).reduce((s: number, r: { api_cost_gbp: number }) => s + Number(r.api_cost_gbp), 0);
      setBudget({ used, total, pct: total > 0 ? Math.round((used / total) * 100) : 0 });
    }
  }, [supabase, pathTaskId]);

  useEffect(() => { loadCtx(); }, [loadCtx]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const iv = setInterval(() => {
      const mins = Math.floor((Date.now() - sessionStart) / 60000);
      const h = Math.floor(mins / 60);
      setElapsed(h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`);
      if (!escalated && Date.now() - lastProgress >= STUCK_MS) {
        setShowStuck(true);
        setEscalated(true);
      }
    }, 30000);
    return () => clearInterval(iv);
  }, [sessionStart, lastProgress, escalated]);

  async function send() {
    if (!input.trim() || sending || !userId) return;
    if (budget && budget.pct >= 100) {
      setMessages(p => [...p, { role: 'assistant', content: 'Your monthly AI budget is exhausted. Nick will need to increase it before you can continue.' }]);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setSending(true);
    setLastProgress(Date.now());
    const msgs: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(msgs);

    try {
      const res = await fetch('/api/guide/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, userId, projectId, taskId: activeTask?.id ?? null, mode: 'work' }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      setMessages(p => [...p, { role: 'assistant', content: data.reply ?? data.error ?? 'Something went wrong.' }]);

      // Refresh budget
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: ud } = await supabase.from('api_usage_log').select('api_cost_gbp').eq('user_id', userId).gte('created_at', monthStart);
      if (ud && budget) {
        const used = ud.reduce((s: number, r: { api_cost_gbp: number }) => s + Number(r.api_cost_gbp), 0);
        setBudget({ ...budget, used, pct: budget.total > 0 ? Math.round((used / budget.total) * 100) : 0 });
      }
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Connection error — try again.' }]);
    }
    setSending(false);
  }

  async function escalate() {
    if (!userId || !projectId) return;
    setEscalating(true);
    const ctx = messages.slice(-10).map(m => `${m.role === 'user' ? 'Charlene' : 'Guide'}: ${m.content}`).join('\n');
    await supabase.from('escalations').insert({
      user_id: userId, project_id: projectId,
      summary: `Stuck on: ${activeTask?.title ?? activeTask?.text ?? 'current task'}. 30+ minutes without resolution.`,
      guide_context: ctx, status: 'pending',
    });
    setShowStuck(false);
    setMessages(p => [...p, { role: 'assistant', content: "I've flagged Nick with a summary of where we are. He'll review when he's next on. Keep working if you can — or take a break." }]);
    setEscalating(false);
  }

  const budgetColor = !budget ? '#16A34A'
    : budget.pct >= 95 ? '#DC2626'
    : budget.pct >= 80 ? '#D97706'
    : budget.pct >= 50 ? '#CA8A04'
    : '#16A34A';

  const budgetExhausted = budget && budget.pct >= 100;

  if (!open) {
    return (
      <div style={{ width: 40, flexShrink: 0, borderLeft: '1px solid #E2E8F0', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
        <button
          onClick={() => setOpen(true)}
          title="Open Guide"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 8, borderRadius: 8 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 4, writingMode: 'vertical-lr', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
          Guide
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: embedded ? '100%' : 320, flexShrink: 0, borderLeft: embedded ? 'none' : '1px solid #E2E8F0', background: 'white', display: 'flex', flexDirection: 'column', height: embedded ? '100%' : '100dvh', position: embedded ? 'relative' : 'sticky', top: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#1B4332' }}>
            <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Guide</span>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, borderRadius: 4, fontSize: 16, lineHeight: 1 }}>
          ×
        </button>
      </div>

      {/* Context pills */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {activeTask && <Pill label={activeTask.title ?? activeTask.text} color="#1B4332" bg="#DCFCE7" />}
        <Pill label={`${elapsed} session`} color="#64748B" bg="#F1F5F9" />
        {budget && <Pill label={`£${budget.used.toFixed(2)} / £${budget.total.toFixed(0)}`} color={budgetColor} bg={`${budgetColor}18`} />}
      </div>

      {/* Budget warning */}
      {budget && budget.pct >= 80 && !budgetExhausted && (
        <div style={{ padding: '6px 14px', background: budget.pct >= 95 ? '#FEE2E2' : '#FEF3C7', fontSize: 11, color: budget.pct >= 95 ? '#DC2626' : '#D97706', borderBottom: '1px solid #E2E8F0' }}>
          Budget at {budget.pct}% — be targeted with questions.
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 0' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 12px' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>✦</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Guide — BFB</div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
              {activeTask
                ? `Working on: ${activeTask.title ?? activeTask.text}. Ask me anything.`
                : 'Ask me anything about the task or the BFB methodology.'}
            </div>
            {/* Quick actions */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Where do I start?',
                'What does Nick expect here?',
                'Check my approach',
              ].map(q => (
                <button key={q} onClick={() => { setInput(q); }} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 12px', fontSize: 11, color: '#475569', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            <div style={{
              maxWidth: '85%', padding: '9px 12px',
              borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
              background: msg.role === 'user' ? '#1B4332' : '#F8FAFC',
              color: msg.role === 'user' ? 'white' : '#0F172A',
              fontSize: 12, lineHeight: 1.6,
              border: msg.role === 'assistant' ? '1px solid #E2E8F0' : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', gap: 4, padding: '4px 0', marginBottom: 10 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', animation: `gpbounce 0.8s ${i * 0.13}s infinite` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={budgetExhausted ? 'Budget exhausted.' : 'Ask the Guide… (Enter to send)'}
            disabled={!!sending || !!budgetExhausted}
            rows={2}
            style={{ flex: 1, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, resize: 'none', fontFamily: 'inherit', background: budgetExhausted ? '#F8FAFC' : 'white' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || !!sending || !!budgetExhausted}
            style={{ padding: '0 12px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: !input.trim() || sending ? 'not-allowed' : 'pointer', opacity: !input.trim() || sending ? 0.5 : 1, alignSelf: 'stretch' }}
          >
            ↑
          </button>
        </div>
      </div>

      {/* Stuck modal */}
      {showStuck && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: '24px', maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>You've been stuck for a while</div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, margin: '0 0 16px' }}>That's normal. Want me to flag Nick with a summary of where we are?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={escalate} disabled={escalating} style={{ flex: 1, padding: '9px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: escalating ? 'wait' : 'pointer' }}>
                {escalating ? 'Flagging…' : 'Flag Nick'}
              </button>
              <button onClick={() => { setShowStuck(false); setLastProgress(Date.now()); setEscalated(false); }} style={{ flex: 1, padding: '9px', background: 'white', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes gpbounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
    </div>
  );
}
