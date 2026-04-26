'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  trigger_stage: string;
  status: string;
  updated_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  initial:   'Initial',
  stabilise: 'Stabilise',
  rebuild:   'Rebuild',
  graduate:  'Graduate',
};

const STAGE_COLORS: Record<string, { color: string; bg: string }> = {
  initial:   { color: '#DC2626', bg: '#FEE2E2' },
  stabilise: { color: '#D97706', bg: '#FEF3C7' },
  rebuild:   { color: '#1D4ED8', bg: '#EFF6FF' },
  graduate:  { color: '#16A34A', bg: '#DCFCE7' },
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('id, name, subject, trigger_stage, status, updated_at')
      .order('trigger_stage')
      .order('updated_at', { ascending: false });
    setTemplates((data ?? []) as EmailTemplate[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function createNew() {
    const { data: authUser } = await supabase.auth.getUser();

    const { data: project } = await supabase
      .from('projects').select('id').eq('slug', 'bfb').single();

    const { data: newTemplate } = await supabase.from('email_templates').insert({
      name: 'Untitled template',
      subject: '',
      body_html: '',
      trigger_stage: 'initial',
      status: 'draft',
      project_id: project?.id ?? null,
      created_by: authUser.user?.id,
    }).select('id').single();

    if (newTemplate) {
      window.location.href = `/bfb/templates/${newTemplate.id}`;
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0, marginBottom: 4 }}>Email templates</h1>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>BFB client communication</div>
        </div>
        <button
          onClick={createNew}
          style={{
            padding: '9px 18px', background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + New template
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : templates.length === 0 ? (
        <div style={{ background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>No templates yet</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
            Create email templates for each stage of the BFB recovery process.
          </div>
          <button onClick={createNew} style={{ padding: '9px 18px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Create first template
          </button>
        </div>
      ) : (
        <div>
          {/* Group by stage */}
          {['initial', 'stabilise', 'rebuild', 'graduate'].map(stage => {
            const stageTemplates = templates.filter(t => t.trigger_stage === stage);
            if (stageTemplates.length === 0) return null;
            const style = STAGE_COLORS[stage];
            return (
              <div key={stage} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: style.color, background: style.bg, padding: '4px 10px', borderRadius: 6,
                  display: 'inline-block', marginBottom: 8,
                }}>
                  {STAGE_LABELS[stage]}
                </div>
                <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last edited</th>
                        <th style={{ width: 80 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {stageTemplates.map(t => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{t.name}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--ink-2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                              background: t.status === 'published' ? '#DCFCE7' : '#F1F5F9',
                              color: t.status === 'published' ? '#166534' : '#64748B',
                            }}>
                              {t.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--ink-3)' }}>
                            {new Date(t.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Link href={`/bfb/templates/${t.id}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                              Edit →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
