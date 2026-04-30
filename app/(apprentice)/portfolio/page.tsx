'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Submission {
  id: string;
  task_id: string | null;
  project_id: string;
  status: string;
  narrative: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_outcome: string | null;
  review_notes: string | null;
  tasks?: { title: string | null; text: string } | null;
  projects?: { name: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  approved:          { label: 'Approved',         color: '#16A34A', bg: '#DCFCE7' },
  submitted:         { label: 'In review',         color: '#D97706', bg: '#FEF3C7' },
  in_review:         { label: 'In review',         color: '#D97706', bg: '#FEF3C7' },
  changes_requested: { label: 'Changes needed',    color: '#DC2626', bg: '#FEE2E2' },
  archived:          { label: 'Archived',          color: '#64748B', bg: '#F1F5F9' },
  draft:             { label: 'Draft',             color: '#64748B', bg: '#F1F5F9' },
};

export default function PortfolioPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data } = await supabase
      .from('submissions')
      .select('id, task_id, project_id, status, narrative, submitted_at, reviewed_at, review_outcome, review_notes, tasks(title, text), projects(name)')
      .eq('user_id', authUser.id)
      .order('submitted_at', { ascending: false });

    setSubmissions((data ?? []) as unknown as Submission[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const approved = submissions.filter(s => s.status === 'approved');
  const inProgress = submissions.filter(s => !['approved', 'archived'].includes(s.status));

  if (loading) {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ height: 28, width: 180, background: '#F1F5F9', borderRadius: 6, marginBottom: 20 }} />
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 80, background: '#F1F5F9', borderRadius: 10, marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  const changesNeeded = submissions.filter(s => s.status === 'changes_requested').length;

  return (
    <div style={{ padding: 28, maxWidth: 720 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.4px', margin: '0 0 4px' }}>
          Portfolio
        </h1>
        <div style={{ fontSize: 13, color: '#64748B' }}>Your submission history</div>
      </div>

      {/* Stats row */}
      {submissions.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ padding: '10px 16px', borderRadius: 10, background: '#DCFCE7', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#16A34A', letterSpacing: '-0.3px' }}>{approved.length}</span>
            <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 500 }}>Approved</span>
          </div>
          {inProgress.length > 0 && (
            <div style={{ padding: '10px 16px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#D97706', letterSpacing: '-0.3px' }}>{inProgress.length}</span>
              <span style={{ fontSize: 11, color: '#D97706', fontWeight: 500 }}>In review</span>
            </div>
          )}
          {changesNeeded > 0 && (
            <div style={{ padding: '10px 16px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#DC2626', letterSpacing: '-0.3px' }}>{changesNeeded}</span>
              <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>Changes needed</span>
            </div>
          )}
          <div style={{ padding: '10px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#64748B', letterSpacing: '-0.3px' }}>{submissions.length}</span>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Total</span>
          </div>
        </div>
      )}

      {submissions.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: 14, border: '1px solid #E2E8F0',
          padding: '48px 32px', textAlign: 'center',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: '#94A3B8' }}>
              <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            No submissions yet
          </div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
            Complete and submit a task to see your work here. Every approved submission builds your portfolio.
          </div>
        </div>
      ) : (
        <div>
          {submissions.map(sub => {
            const statusInfo = STATUS_LABELS[sub.status] ?? STATUS_LABELS.draft;
            const taskTitle = sub.tasks?.title ?? sub.tasks?.text ?? 'Task';
            const isOpen = expanded === sub.id;
            return (
              <div key={sub.id} style={{
                background: 'white', borderRadius: 12, border: '1px solid #E2E8F0',
                marginBottom: 10, overflow: 'hidden',
              }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : sub.id)}
                  style={{
                    width: '100%', padding: '16px 20px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                      {taskTitle}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12 }}>
                      <span style={{ color: '#64748B' }}>
                        {sub.projects?.name}
                      </span>
                      {sub.submitted_at && (
                        <span style={{ color: '#94A3B8' }}>
                          · {new Date(sub.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                    color: statusInfo.color, background: statusInfo.bg, flexShrink: 0,
                  }}>
                    {statusInfo.label}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#CBD5E1', transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid #F1F5F9' }}>
                    {sub.narrative && (
                      <div style={{ marginTop: 16, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                          Your narrative
                        </div>
                        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>{sub.narrative}</p>
                      </div>
                    )}
                    {sub.review_notes && (
                      <div style={{
                        background: sub.status === 'approved' ? '#DCFCE7' : '#FEE2E2',
                        borderRadius: 8, padding: '12px 14px',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: sub.status === 'approved' ? '#166534' : '#991B1B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                          Nick's feedback
                        </div>
                        <p style={{ fontSize: 13, color: sub.status === 'approved' ? '#166534' : '#991B1B', lineHeight: 1.6, margin: 0 }}>{sub.review_notes}</p>
                      </div>
                    )}
                    {sub.status === 'in_review' || sub.status === 'submitted' ? (
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 12 }}>
                        Awaiting review — Nick will respond within 48 hours.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
