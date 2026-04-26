'use client';

import { useState } from 'react';
import type { Business } from '@/types';

interface BossSettingsProps {
  business: Business;
  onSave: (settings: Partial<Business>) => Promise<void>;
}

export default function BossSettings({ business, onSave }: BossSettingsProps) {
  const [whatsappEnabled, setWhatsappEnabled] = useState(business.notifyWhatsApp ?? false);
  const [emailEnabled, setEmailEnabled] = useState(business.notifyEmail ?? false);
  const [ownerWhatsApp, setOwnerWhatsApp] = useState(business.ownerWhatsApp ?? '');
  const [ownerEmail, setOwnerEmail] = useState(business.ownerEmail ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const NOTIFY_OPTIONS = [
    { id: 'task_start',    label: 'Task started',    default: false },
    { id: 'task_complete', label: 'Task completed',   default: true },
    { id: 'working',       label: 'Working update',   default: false },
    { id: 'daily_summary', label: 'Daily summary',    default: true },
  ] as const;

  const [notifyOn, setNotifyOn] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFY_OPTIONS.map(o => [o.id, o.default]))
  );

  async function save() {
    setSaving(true);
    setSaved(false);
    await onSave({
      notifyWhatsApp: whatsappEnabled,
      notifyEmail: emailEnabled,
      ownerWhatsApp: ownerWhatsApp || undefined,
      ownerEmail: ownerEmail || undefined,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* WhatsApp */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>WhatsApp notifications</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>Sent from your Caldr WhatsApp Business number</div>
          </div>
          <Toggle value={whatsappEnabled} onChange={setWhatsappEnabled} />
        </div>
        {whatsappEnabled && (
          <input
            value={ownerWhatsApp}
            onChange={e => setOwnerWhatsApp(e.target.value)}
            placeholder="+44 7700 900 000"
            style={inputStyle}
          />
        )}
      </div>

      <div style={{ height: 1, background: 'var(--border)' }}/>

      {/* Email */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Email notifications</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>Daily summaries sent via Resend from updates@caldr.ai</div>
          </div>
          <Toggle value={emailEnabled} onChange={setEmailEnabled} />
        </div>
        {emailEnabled && (
          <input
            value={ownerEmail}
            onChange={e => setOwnerEmail(e.target.value)}
            placeholder="boss@company.com"
            type="email"
            style={inputStyle}
          />
        )}
      </div>

      <div style={{ height: 1, background: 'var(--border)' }}/>

      {/* Notify triggers */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>Send notifications for</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NOTIFY_OPTIONS.map(opt => (
            <div key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{opt.label}</div>
              <Toggle value={notifyOn[opt.id] ?? opt.default} onChange={v => setNotifyOn(prev => ({ ...prev, [opt.id]: v }))} />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        style={{
          padding: '12px 0',
          background: saved ? 'var(--accent-light)' : saving ? 'var(--border)' : 'var(--accent)',
          color: saved ? 'var(--accent)' : saving ? 'var(--ink-3)' : 'white',
          border: 'none', borderRadius: 12,
          fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {saved ? '✓ Settings saved' : saving ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22,
        background: value ? 'var(--accent)' : 'var(--border)',
        borderRadius: 11, border: 'none', cursor: 'pointer',
        position: 'relative', flexShrink: 0, transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: value ? 21 : 3,
        width: 16, height: 16,
        background: 'white', borderRadius: '50%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }}/>
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 10, fontSize: 13, color: 'var(--ink)',
  outline: 'none', fontFamily: 'inherit',
};
