'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  trigger_stage: string;
  status: string;
  updated_at: string;
}

const VARIABLES = [
  { key: '{{client_name}}',    label: 'Client name' },
  { key: '{{business_name}}',  label: 'Business name' },
  { key: '{{next_action}}',    label: 'Next action' },
];

const DUMMY_VALUES: Record<string, string> = {
  '{{client_name}}': 'Sarah',
  '{{business_name}}': 'Patel Catering Ltd',
  '{{next_action}}': 'review your cash flow statement by Friday',
};

const STAGES = [
  { value: 'initial',   label: 'Initial — First contact' },
  { value: 'stabilise', label: 'Stabilise — Cash crisis phase' },
  { value: 'rebuild',   label: 'Rebuild — Recovery phase' },
  { value: 'graduate',  label: 'Graduate — Programme complete' },
];

type EditorFormat = 'bold' | 'italic' | 'bullet' | 'link';

export default function TemplateEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', params.id)
      .single();
    setTemplate(data ?? null);
    setLoading(false);
  }, [supabase, params.id]);

  useEffect(() => { load(); }, [load]);

  function scheduleAutosave(updates: Partial<EmailTemplate>) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      await supabase.from('email_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', params.id);
    }, 800);
  }

  function update(field: keyof EmailTemplate, value: string) {
    if (!template) return;
    const updated = { ...template, [field]: value };
    setTemplate(updated);
    scheduleAutosave({ [field]: value });
  }

  async function save(publish?: boolean) {
    if (!template) return;
    setSaving(true);
    const updates: Partial<EmailTemplate> = {
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      trigger_stage: template.trigger_stage,
      updated_at: new Date().toISOString(),
    };
    if (publish !== undefined) updates.status = publish ? 'published' : 'draft';

    await supabase.from('email_templates').update(updates).eq('id', params.id);
    setTemplate(prev => prev ? { ...prev, ...updates } : null);
    setSaving(false);
    setNotification(publish ? 'Published' : 'Saved');
    setTimeout(() => setNotification(null), 2500);
  }

  async function sendTestEmail() {
    if (!template) return;
    setTestSending(true);
    try {
      await fetch('/api/bfb/templates/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });
      setTestSent(true);
      setNotification('Test email sent to your address.');
      setTimeout(() => { setTestSent(false); setNotification(null); }, 4000);
    } catch {
      setNotification('Send failed — check Resend API key.');
      setTimeout(() => setNotification(null), 3000);
    }
    setTestSending(false);
  }

  async function deleteTemplate() {
    if (!confirm('Delete this template?')) return;
    await supabase.from('email_templates').delete().eq('id', params.id);
    router.push('/bfb/templates');
  }

  function applyFormat(format: EditorFormat) {
    const ta = document.getElementById('body-editor') as HTMLTextAreaElement | null;
    if (!ta || !template) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    const selected = template.body_html.slice(start, end);
    let replacement = selected;
    if (format === 'bold') replacement = `<strong>${selected}</strong>`;
    else if (format === 'italic') replacement = `<em>${selected}</em>`;
    else if (format === 'bullet') replacement = `\n• ${selected}`;
    else if (format === 'link') {
      const url = prompt('URL:');
      if (url) replacement = `<a href="${url}">${selected || url}</a>`;
    }
    const newBody = template.body_html.slice(0, start) + replacement + template.body_html.slice(end);
    update('body_html', newBody);
  }

  function renderPreview(html: string): string {
    let result = html;
    for (const [key, val] of Object.entries(DUMMY_VALUES)) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
    }
    return result;
  }

  if (loading || !template) {
    return <div style={{ padding: 28, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, background: 'var(--accent)', color: 'white',
          padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 100,
        }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/bfb/templates" style={{ fontSize: 13, color: 'var(--ink-2)', textDecoration: 'none' }}>← Templates</Link>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={template.name}
            onChange={e => update('name', e.target.value)}
            style={{
              fontSize: 18, fontWeight: 700, color: 'var(--ink)', border: 'none',
              background: 'none', outline: 'none', width: '100%',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
            background: template.status === 'published' ? '#DCFCE7' : '#F1F5F9',
            color: template.status === 'published' ? '#166534' : '#64748B',
          }}>
            {template.status}
          </span>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            style={{ padding: '6px 14px', background: previewMode ? 'var(--accent-light)' : 'var(--card)', color: previewMode ? 'var(--accent)' : 'var(--ink-2)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}
          >
            {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            style={{ padding: '6px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: 'var(--ink-2)' }}
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button
            onClick={() => save(template.status !== 'published')}
            disabled={saving}
            style={{ padding: '6px 14px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {template.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Editor / Preview */}
        <div>
          {!previewMode ? (
            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {/* Subject line */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Subject line
                </div>
                <input
                  type="text"
                  value={template.subject}
                  onChange={e => update('subject', e.target.value)}
                  placeholder="Subject line"
                  style={{ width: '100%', border: 'none', background: 'none', outline: 'none', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}
                />
              </div>

              {/* Toolbar */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4 }}>
                {([
                  { format: 'bold' as EditorFormat, label: 'B', style: { fontWeight: 700 } },
                  { format: 'italic' as EditorFormat, label: 'I', style: { fontStyle: 'italic' } },
                  { format: 'bullet' as EditorFormat, label: '• List', style: {} },
                  { format: 'link' as EditorFormat, label: 'Link', style: {} },
                ]).map(btn => (
                  <button
                    key={btn.format}
                    onClick={() => applyFormat(btn.format)}
                    style={{
                      padding: '4px 9px', background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 5, fontSize: 12, cursor: 'pointer', color: 'var(--ink-2)',
                      ...btn.style,
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Body */}
              <textarea
                id="body-editor"
                value={template.body_html}
                onChange={e => update('body_html', e.target.value)}
                placeholder="Email body — you can use HTML or plain text. Use {{client_name}}, {{business_name}}, {{next_action}} for variables."
                rows={20}
                style={{
                  width: '100%', border: 'none', padding: '16px',
                  fontSize: 13, lineHeight: 1.7, fontFamily: 'inherit',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '24px 28px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Subject
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 20 }}>
                {renderPreview(template.subject) || <span style={{ color: 'var(--ink-3)' }}>No subject</span>}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div
                  style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink)' }}
                  dangerouslySetInnerHTML={{ __html: renderPreview(template.body_html).replace(/\n/g, '<br/>') }}
                />
              </div>
              <div style={{ marginTop: 20, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, fontSize: 11, color: 'var(--ink-3)' }}>
                Previewed with dummy data: {Object.entries(DUMMY_VALUES).map(([k, v]) => `${k} → ${v}`).join(' · ')}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Stage selector */}
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Trigger stage
            </div>
            <select
              value={template.trigger_stage}
              onChange={e => update('trigger_stage', e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
            >
              {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Variables */}
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Variables
            </div>
            {VARIABLES.map(v => (
              <div key={v.key} style={{ marginBottom: 8 }}>
                <code style={{
                  fontSize: 11, background: 'var(--card)', padding: '2px 6px', borderRadius: 4,
                  color: 'var(--accent)', display: 'block', marginBottom: 2,
                }}>
                  {v.key}
                </code>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{v.label}</div>
              </div>
            ))}
          </div>

          {/* Test send */}
          <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: '16px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Test email
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 10 }}>
              Sends to your account email with dummy variables filled in.
            </div>
            <button
              onClick={sendTestEmail}
              disabled={testSending || testSent}
              style={{
                width: '100%', padding: '9px', background: testSent ? '#DCFCE7' : 'var(--card)',
                color: testSent ? '#166534' : 'var(--ink-2)', border: '1px solid var(--border)',
                borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: testSending ? 'wait' : 'pointer',
              }}
            >
              {testSending ? 'Sending…' : testSent ? '✓ Sent' : 'Send test email'}
            </button>
          </div>

          {/* Delete */}
          <button
            onClick={deleteTemplate}
            style={{
              width: '100%', padding: '9px', background: 'none', color: '#DC2626',
              border: '1px solid #FECACA', borderRadius: 7, fontSize: 12, cursor: 'pointer',
            }}
          >
            Delete template
          </button>
        </div>
      </div>
    </div>
  );
}
