'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface BudgetContext {
  used: number;
  total: number;
  pct: number;
}

interface TaskContext {
  id: string;
  title: string | null;
  text: string;
  project_id: string | null;
  kanban_status: string;
  elapsed_seconds?: number;
}

interface EscalationTimer {
  start: number;
  lastProgress: number;
  escalated: boolean;
}

const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export default function GuidePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<TaskContext | null>(null);
  const [budget, setBudget] = useState<BudgetContext | null>(null);
  const [sessionStart] = useState(Date.now());
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [stuckTimer, setStuckTimer] = useState<EscalationTimer>({ start: Date.now(), lastProgress: Date.now(), escalated: false });
  const [elapsedDisplay, setElapsedDisplay] = useState('0m');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const loadContext = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    setUserId(authUser.id);

    // Find active task
    const { data: accessData } = await supabase
      .from('project_access')
      .select('project_id')
      .eq('user_id', authUser.id)
      .in('access_level', ['sandbox', 'contribute'])
      .limit(1)
      .single();

    if (accessData) {
      setProjectId(accessData.project_id);

      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, text, project_id, kanban_status, elapsed_seconds')
        .eq('project_id', accessData.project_id)
        .eq('kanban_status', 'doing')
        .or(`assigned_to.eq.${authUser.id},assigned_to.is.null`)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (taskData) setActiveTask(taskData as TaskContext);
    }

    // Budget
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [{ data: budgetData }, { data: usageData }] = await Promise.all([
      supabase.from('user_budgets').select('monthly_budget_gbp').eq('user_id', authUser.id).single(),
      supabase.from('api_usage_log')
        .select('api_cost_gbp')
        .eq('user_id', authUser.id)
        .gte('created_at', monthStart),
    ]);

    if (budgetData) {
      const total = Number(budgetData.monthly_budget_gbp);
      const used = (usageData ?? []).reduce((acc: number, r: { api_cost_gbp: number }) => acc + Number(r.api_cost_gbp), 0);
      setBudget({ used, total, pct: total > 0 ? Math.round((used / total) * 100) : 0 });
    }
  }, [supabase]);

  useEffect(() => { loadContext(); }, [loadContext]);

  // Elapsed time display
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStart;
      const mins = Math.floor(elapsed / 60000);
      const hours = Math.floor(mins / 60);
      setElapsedDisplay(hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`);

      // Check stuck timer
      setStuckTimer(prev => {
        if (!prev.escalated) {
          const timeSinceProgress = Date.now() - prev.lastProgress;
          if (timeSinceProgress >= STUCK_THRESHOLD_MS) {
            setShowEscalationModal(true);
            return { ...prev, escalated: true };
          }
        }
        return prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || sending || !userId) return;

    // Budget hard cap check
    if (budget && budget.pct >= 100) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Your monthly AI budget has been reached. Nick will need to increase your budget before you can continue using the Guide.',
      }]);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    // Mark progress for stuck timer
    setStuckTimer(prev => ({ ...prev, lastProgress: Date.now() }));

    try {
      const res = await fetch('/api/guide/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMsg }],
          userId,
          projectId,
          taskId: activeTask?.id ?? null,
          mode: 'work',
        }),
      });

      const data = await res.json() as { reply?: string; error?: string };
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? data.error ?? 'Something went wrong.' }]);

      // Update budget display
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: usageData } = await supabase
        .from('api_usage_log')
        .select('api_cost_gbp')
        .eq('user_id', userId)
        .gte('created_at', monthStart);

      if (usageData && budget) {
        const used = usageData.reduce((acc: number, r: { api_cost_gbp: number }) => acc + Number(r.api_cost_gbp), 0);
        setBudget({ ...budget, used, pct: budget.total > 0 ? Math.round((used / budget.total) * 100) : 0 });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error — please try again.' }]);
    }

    setSending(false);
  }

  async function escalateToNick() {
    if (!userId || !projectId) return;
    setEscalating(true);

    const conversationSummary = messages
      .slice(-10)
      .map(m => `${m.role === 'user' ? 'Charlene' : 'Guide'}: ${m.content}`)
      .join('\n');

    await supabase.from('escalations').insert({
      user_id: userId,
      project_id: projectId,
      summary: `Stuck on: ${activeTask?.title ?? activeTask?.text ?? 'current task'}. 30+ minutes in Guide without resolution.`,
      guide_context: conversationSummary,
      status: 'pending',
    });

    setShowEscalationModal(false);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: "I've flagged Nick with a summary of where we are. He'll review when he's next on. Keep working if you can — or take a break. Being stuck is normal; what matters is you flagged it.",
    }]);
    setEscalating(false);
  }

  const budgetColor = budget
    ? budget.pct >= 95 ? '#DC2626'
      : budget.pct >= 80 ? '#D97706'
      : budget.pct >= 50 ? '#CA8A04'
      : '#16A34A'
    : '#16A34A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', padding: 0 }}>
      {/* Context pills */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid #E2E8F0',
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        background: 'white',
      }}>
        {activeTask && (
          <ContextPill label={`BFB: ${activeTask.title ?? activeTask.text}`} color="#1B4332" bg="#DCFCE7" />
        )}
        <ContextPill label="Sandbox mode" color="#1D4ED8" bg="#EFF6FF" />
        <ContextPill label={elapsedDisplay + ' this session'} color="#64748B" bg="#F1F5F9" />
        {budget && (
          <ContextPill
            label={`Budget: £${budget.used.toFixed(2)} / £${budget.total.toFixed(0)}`}
            color={budgetColor}
            bg={`${budgetColor}15`}
          />
        )}
      </div>

      {/* Budget warnings */}
      {budget && budget.pct >= 50 && budget.pct < 100 && (
        <div style={{
          padding: '8px 20px', background: budget.pct >= 95 ? '#FEE2E2' : budget.pct >= 80 ? '#FEF3C7' : '#FEF9C3',
          borderBottom: '1px solid #E2E8F0', fontSize: 12,
          color: budget.pct >= 95 ? '#DC2626' : '#D97706',
        }}>
          {budget.pct >= 95
            ? `Budget at ${budget.pct}% — almost exhausted. Complete your current task before it runs out.`
            : budget.pct >= 80
            ? `Budget at ${budget.pct}%. Be targeted with your questions.`
            : `Budget at ${budget.pct}%.`}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
              Guide — BFB
            </div>
            <div style={{ fontSize: 13, color: '#64748B', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
              Ask me anything about the task, the BFB methodology, or how to approach what you're building.
              {activeTask && ` You're currently working on: ${activeTask.title ?? activeTask.text}.`}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 12,
          }}>
            <div style={{
              maxWidth: '78%',
              padding: '11px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? '#1B4332' : 'white',
              color: msg.role === 'user' ? 'white' : '#0F172A',
              fontSize: 13,
              lineHeight: 1.6,
              border: msg.role === 'assistant' ? '1px solid #E2E8F0' : 'none',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', gap: 5, padding: '8px 0', marginBottom: 12 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%', background: '#94A3B8',
                animation: `bounce 0.8s ${i * 0.13}s infinite`,
              }} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', background: 'white' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={budget?.pct && budget.pct >= 100 ? 'Budget exhausted — Guide unavailable.' : 'Ask the Guide…'}
            disabled={sending || (budget?.pct !== undefined && budget.pct >= 100)}
            rows={2}
            style={{
              flex: 1, padding: '10px 12px',
              border: '1px solid #E2E8F0', borderRadius: 10,
              fontSize: 13, resize: 'none', fontFamily: 'inherit',
              background: budget?.pct !== undefined && budget.pct >= 100 ? '#F8FAFC' : 'white',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending || (budget?.pct !== undefined && budget.pct >= 100)}
            style={{
              padding: '0 18px', background: '#1B4332', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
              opacity: !input.trim() || sending ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* Stuck timer modal */}
      {showEscalationModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '28px 28px 24px', maxWidth: 420, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
              It looks like you've been stuck for a while
            </div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
              That's completely normal. Want me to summarise where we are and flag Nick?
            </p>
            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              Nick will see: what you're building, what you've tried, where you're stuck.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={escalateToNick}
                disabled={escalating}
                style={{
                  flex: 1, padding: '10px', background: '#1B4332', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: escalating ? 'wait' : 'pointer',
                }}
              >
                {escalating ? 'Flagging…' : 'Yes, flag Nick'}
              </button>
              <button
                onClick={() => {
                  setShowEscalationModal(false);
                  setStuckTimer(prev => ({ ...prev, lastProgress: Date.now(), escalated: false }));
                }}
                style={{
                  flex: 1, padding: '10px', background: 'white', color: '#64748B',
                  border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                }}
              >
                Keep going
              </button>
              <button
                onClick={() => setShowEscalationModal(false)}
                style={{
                  padding: '10px 14px', background: 'white', color: '#94A3B8',
                  border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

function ContextPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color,
      background: bg, padding: '4px 10px', borderRadius: 20,
      border: `1px solid ${color}22`,
    }}>
      {label}
    </div>
  );
}
