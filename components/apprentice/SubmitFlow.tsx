'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SubmitTask {
  id: string;
  title: string | null;
  text: string;
  project_id: string | null;
  success_criteria: string[] | null;
}

interface Props {
  task: SubmitTask;
  userId: string;
  workspaceId: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}

const SELF_CHECK_ITEMS = [
  'Does this meet the success criteria in the task brief?',
  'Have you tested on both desktop and mobile?',
  'Does the code follow the patterns in the existing codebase?',
  'Have you written your narrative (what/why/uncertainties/learnings)?',
  'Is there anything you\'re unsure about that Nick should know?',
];

type Step = 'checklist' | 'self_check' | 'narrative' | 'confirm';

export default function SubmitFlow({ task, userId, workspaceId, onClose, onSubmitted }: Props) {
  const [step, setStep] = useState<Step>('checklist');
  const [checks, setChecks] = useState<boolean[]>(new Array(SELF_CHECK_ITEMS.length).fill(false));
  const [selfCheckResult, setSelfCheckResult] = useState<string | null>(null);
  const [selfCheckLoading, setSelfCheckLoading] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const allChecked = checks.every(Boolean);
  const title = task.title ?? task.text;

  async function runSelfCheck() {
    setSelfCheckLoading(true);
    try {
      const res = await fetch('/api/guide/self-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: title,
          successCriteria: task.success_criteria ?? [],
          narrative,
          userId,
        }),
      });
      const data = await res.json() as { result?: string };
      setSelfCheckResult(data.result ?? 'Self-check complete.');
    } catch {
      setSelfCheckResult('Self-check unavailable — proceed with your own assessment.');
    }
    setSelfCheckLoading(false);
    setStep('narrative');
  }

  async function submit() {
    setSubmitting(true);

    // Build diff summary from recent actions
    const { data: recentActions } = await supabase
      .from('actions')
      .select('action_type, target_table, created_at')
      .eq('user_id', userId)
      .eq('project_id', task.project_id)
      .order('created_at', { ascending: false })
      .limit(20);

    const diffSummary = {
      action_count: recentActions?.length ?? 0,
      actions: recentActions?.map(a => `${a.action_type} on ${a.target_table}`) ?? [],
    };

    await supabase.from('submissions').insert({
      user_id: userId,
      project_id: task.project_id,
      workspace_id: workspaceId,
      task_id: task.id,
      status: 'submitted',
      narrative,
      video_link: videoLink || null,
      diff_summary: diffSummary,
      self_check_results: { score: selfCheckResult, checks },
      submitted_at: new Date().toISOString(),
    });

    // Move task to in_review
    await supabase.from('tasks').update({ kanban_status: 'in_review' }).eq('id', task.id);

    // Log action
    await supabase.from('actions').insert({
      user_id: userId,
      project_id: task.project_id,
      workspace_id: workspaceId,
      action_type: 'submission_created',
      target_table: 'submissions',
      actor_role: 'apprentice',
      reversible: false,
      after_state: { task_id: task.id, status: 'submitted' },
    });

    setSubmitting(false);
    onSubmitted();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '90dvh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Submit for review</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94A3B8', fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Step indicators */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 8 }}>
          {(['checklist', 'self_check', 'narrative', 'confirm'] as Step[]).map((s, i) => {
            const stepLabels = ['Self-check', 'Guide review', 'Narrative', 'Submit'];
            const isCurrent = step === s;
            const isDone = ['checklist', 'self_check', 'narrative', 'confirm'].indexOf(step) > i;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isDone ? '#DCFCE7' : isCurrent ? '#1B4332' : '#F1F5F9',
                  color: isDone ? '#16A34A' : isCurrent ? 'white' : '#94A3B8',
                }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 11, color: isCurrent ? '#0F172A' : '#94A3B8', fontWeight: isCurrent ? 600 : 400 }}>
                  {stepLabels[i]}
                </span>
                {i < 3 && <span style={{ color: '#E2E8F0', fontSize: 14 }}>→</span>}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Step 1: Self-check checklist */}
          {step === 'checklist' && (
            <div>
              <p style={{ fontSize: 13, color: '#374151', marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
                Check each box honestly before submitting. Nick reviews based on these criteria.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {SELF_CHECK_ITEMS.map((item, i) => (
                  <label key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={checks[i]}
                      onChange={e => {
                        const next = [...checks];
                        next[i] = e.target.checked;
                        setChecks(next);
                      }}
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: '#1B4332' }}
                    />
                    <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setStep('self_check')}
                disabled={!allChecked}
                style={{
                  width: '100%', padding: '11px', background: allChecked ? '#1B4332' : '#E2E8F0',
                  color: allChecked ? 'white' : '#94A3B8', border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: allChecked ? 'pointer' : 'not-allowed',
                }}
              >
                {allChecked ? 'Continue → Run Guide self-check' : `Check all items (${checks.filter(Boolean).length}/${SELF_CHECK_ITEMS.length})`}
              </button>
            </div>
          )}

          {/* Step 2: Guide self-check */}
          {step === 'self_check' && (
            <div>
              <p style={{ fontSize: 13, color: '#374151', marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
                The Guide will score your work against the task's success criteria and flag any weaknesses before you submit.
              </p>
              {selfCheckResult ? (
                <div style={{
                  background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0',
                  padding: '14px 16px', marginBottom: 16, fontSize: 13, color: '#374151', lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {selfCheckResult}
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>
                    Add a brief note about what you built (helps the Guide give better feedback):
                  </div>
                  <textarea
                    value={narrative}
                    onChange={e => setNarrative(e.target.value)}
                    placeholder="e.g. I built the template list and editor form. I used a rich text approach with contenteditable. Not sure if the autosave timing is right."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0',
                      borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
              {!selfCheckResult ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={runSelfCheck}
                    disabled={selfCheckLoading}
                    style={{
                      flex: 1, padding: '11px', background: '#1B4332', color: 'white',
                      border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: selfCheckLoading ? 'wait' : 'pointer',
                    }}
                  >
                    {selfCheckLoading ? 'Guide is reviewing…' : 'Run self-check with Guide'}
                  </button>
                  <button
                    onClick={() => setStep('narrative')}
                    style={{
                      padding: '11px 16px', background: 'white', color: '#64748B',
                      border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    Skip
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setStep('narrative')}
                  style={{
                    width: '100%', padding: '11px', background: '#1B4332', color: 'white',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Continue → Write narrative
                </button>
              )}
            </div>
          )}

          {/* Step 3: Narrative */}
          {step === 'narrative' && (
            <div>
              <p style={{ fontSize: 13, color: '#374151', marginTop: 0, marginBottom: 4, lineHeight: 1.6 }}>
                Your narrative is read by Nick. Write honestly about what you built and your choices.
              </p>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
                Cover: what you built · why you made the choices you did · what you're uncertain about · what you learned
              </div>
              <textarea
                value={narrative}
                onChange={e => setNarrative(e.target.value)}
                placeholder="What did you build? What choices did you make and why? What are you unsure about? What did you learn about the BFB product while building this?"
                rows={7}
                style={{
                  width: '100%', padding: '12px', border: '1px solid #E2E8F0',
                  borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
                  boxSizing: 'border-box', marginBottom: 12,
                }}
              />
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6 }}>
                  Loom / video link (optional)
                </label>
                <input
                  type="url"
                  value={videoLink}
                  onChange={e => setVideoLink(e.target.value)}
                  placeholder="https://loom.com/share/..."
                  style={{
                    width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
                    borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                onClick={() => setStep('confirm')}
                disabled={narrative.trim().length < 20}
                style={{
                  width: '100%', padding: '11px',
                  background: narrative.trim().length >= 20 ? '#1B4332' : '#E2E8F0',
                  color: narrative.trim().length >= 20 ? 'white' : '#94A3B8',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: narrative.trim().length >= 20 ? 'pointer' : 'not-allowed',
                }}
              >
                Continue → Review & submit
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div>
              <div style={{ background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Your narrative
                </div>
                <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{narrative}</p>
              </div>
              {videoLink && (
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                  Video: <a href={videoLink} target="_blank" rel="noreferrer" style={{ color: '#1B4332' }}>{videoLink}</a>
                </div>
              )}
              <div style={{ background: '#DCFCE7', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13, color: '#166534' }}>
                This submission will be sent to Nick for review. SLA: 48 hours.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setStep('narrative')}
                  style={{
                    flex: 1, padding: '11px', background: 'white', color: '#64748B',
                    border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  style={{
                    flex: 2, padding: '11px', background: '#1B4332', color: 'white',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit for review'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
