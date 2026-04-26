'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBrand } from '@/context/BrandContext';
import type { Business } from '@/types';

const ACCENT_PRESETS = [
  '#1B4332', '#40916C', '#2D6A4F', // Greens
  '#1E40AF', '#3B82F6', '#6366F1', // Blues
  '#7C3AED', '#9333EA', '#EC4899', // Purple/pink
  '#DC2626', '#EA580C', '#D97706', // Warm
  '#0F172A', '#374151', '#6B7280', // Neutrals
];

const FONT_OPTIONS = [
  { id: 'dm-sans', label: 'DM Sans', preview: 'Aa' },
  { id: 'inter',   label: 'Inter',   preview: 'Aa' },
  { id: 'system',  label: 'System',  preview: 'Aa' },
] as const;

interface SettingsState {
  accentColor: string;
  clippyName: string;
  font: 'dm-sans' | 'inter' | 'system';
  domain: string;
  onboardingCopy: string;
}

export default function SettingsPage() {
  const brand = useBrand();
  const [business, setBusiness] = useState<Business | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    accentColor: brand.accentColor,
    clippyName: brand.clippyName,
    font: brand.font,
    domain: brand.domain ?? '',
    onboardingCopy: brand.onboardingCopy ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(brand.logoUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: u } = await supabase.from('users').select('business_id').eq('id', data.user.id).single();
      if (!u?.business_id) return;
      const { data: biz } = await supabase.from('businesses').select('*').eq('id', u.business_id).single();
      if (biz) {
        setBusiness(biz as Business);
        const b = biz as Business & { clippy_name?: string; font?: string; domain?: string; onboarding_copy?: string };
        setSettings({
          accentColor: b.accent_color ?? '#1B4332',
          clippyName: b.clippy_name ?? 'Clippy',
          font: (b.font as SettingsState['font']) ?? 'dm-sans',
          domain: b.domain ?? '',
          onboardingCopy: b.onboarding_copy ?? '',
        });
        setLogoPreview(b.logo_url ?? null);
      }
    });
  }, []);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function uploadLogo() {
    if (!logoFile || !business) return;
    setLogoUploading(true);
    const form = new FormData();
    form.append('logo', logoFile);
    form.append('businessId', business.id);
    await fetch('/api/admin/logo', { method: 'POST', body: form });
    setLogoFile(null);
    setLogoUploading(false);
  }

  async function save() {
    if (!business) return;
    setSaving(true);
    setSaved(false);
    if (logoFile) await uploadLogo();
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, ...settings }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const label = (text: string) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
      {text}
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>Brand Studio</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Customise your OS — colours, logo, AI name, copy</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Logo */}
        <div style={{ padding: '16px 18px', background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)' }}>
          {label('Logo')}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 12,
              background: 'var(--card)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 24 }}>🏢</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
                {logoPreview ? 'Logo uploaded' : 'No logo set'} · PNG, JPG, SVG · max 2MB
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => fileRef.current?.click()} style={{
                  padding: '7px 14px', background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-2)',
                }}>
                  Choose file
                </button>
                {logoFile && (
                  <button onClick={uploadLogo} disabled={logoUploading} style={{
                    padding: '7px 14px', background: 'var(--accent)', color: 'white',
                    border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: logoUploading ? 'default' : 'pointer',
                  }}>
                    {logoUploading ? 'Uploading…' : 'Upload now'}
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
            </div>
          </div>
        </div>

        {/* Accent colour */}
        <div style={{ padding: '16px 18px', background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)' }}>
          {label('Accent colour')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {ACCENT_PRESETS.map(color => (
              <button
                key={color}
                onClick={() => setSettings(p => ({ ...p, accentColor: color }))}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: color,
                  border: settings.accentColor === color ? `3px solid var(--ink)` : '3px solid transparent',
                  cursor: 'pointer', padding: 0, outline: 'none',
                  boxShadow: settings.accentColor === color ? '0 0 0 2px white inset' : 'none',
                  transition: 'all 0.15s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: settings.accentColor, border: '1px solid var(--border)', flexShrink: 0 }}/>
            <input
              value={customColor}
              onChange={e => {
                setCustomColor(e.target.value);
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  setSettings(p => ({ ...p, accentColor: e.target.value }));
                }
              }}
              placeholder="#1B4332"
              style={{ flex: 1, padding: '7px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'DM Mono, monospace' }}
            />
            <input
              type="color"
              value={settings.accentColor}
              onChange={e => { setSettings(p => ({ ...p, accentColor: e.target.value })); setCustomColor(e.target.value); }}
              style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, background: 'none' }}
            />
          </div>
        </div>

        {/* Font */}
        <div style={{ padding: '16px 18px', background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)' }}>
          {label('Font')}
          <div style={{ display: 'flex', gap: 8 }}>
            {FONT_OPTIONS.map(f => (
              <button
                key={f.id}
                onClick={() => setSettings(p => ({ ...p, font: f.id }))}
                style={{
                  flex: 1, padding: '12px 0',
                  background: settings.font === f.id ? 'var(--accent-light)' : 'var(--card)',
                  color: settings.font === f.id ? 'var(--accent)' : 'var(--ink-2)',
                  border: `1px solid ${settings.font === f.id ? 'var(--accent-light)' : 'var(--border)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  fontFamily: f.id === 'inter' ? 'Inter, sans-serif' : f.id === 'system' ? 'system-ui, sans-serif' : "'DM Sans', sans-serif",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 2 }}>{f.preview}</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{f.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Clippy name */}
        <div style={{ padding: '16px 18px', background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)' }}>
          {label('AI assistant name')}
          <input
            value={settings.clippyName}
            onChange={e => setSettings(p => ({ ...p, clippyName: e.target.value }))}
            placeholder="Clippy"
            maxLength={24}
            style={{ width: '100%', padding: '9px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--ink)', outline: 'none' }}
          />
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            Shown to VAs throughout the OS. Keep it friendly.
          </div>
        </div>

        {/* Custom domain */}
        <div style={{ padding: '16px 18px', background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)' }}>
          {label('Custom domain')}
          <input
            value={settings.domain}
            onChange={e => setSettings(p => ({ ...p, domain: e.target.value }))}
            placeholder="os.yourbusiness.com"
            style={{ width: '100%', padding: '9px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'DM Mono, monospace' }}
          />
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            Point a CNAME to os.caldr.ai. SSL auto-provisioned.
          </div>
        </div>

        {/* Onboarding copy */}
        <div style={{ padding: '16px 18px', background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)' }}>
          {label('Onboarding welcome message')}
          <textarea
            value={settings.onboardingCopy}
            onChange={e => setSettings(p => ({ ...p, onboardingCopy: e.target.value }))}
            rows={4}
            placeholder={`Welcome to ${brand.businessName}! We use Caldr OS to manage calls, tasks, and performance. Your first number will be ready in moments…`}
            style={{
              width: '100%', padding: '9px 12px',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 13, color: 'var(--ink)',
              resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
            Shown during the onboarding tour — step 1. Supports plain text.
          </div>
        </div>

        {/* Live preview */}
        <div style={{
          padding: '14px 18px',
          background: settings.accentColor + '10',
          borderRadius: 14,
          border: `1px solid ${settings.accentColor}30`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: settings.accentColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Live preview
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain', background: 'var(--white)' }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: settings.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14, color: 'white', fontWeight: 700 }}>{brand.businessName.charAt(0)}</span>
              </div>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: settings.font === 'inter' ? 'Inter' : settings.font === 'system' ? 'system-ui' : 'DM Sans' }}>
                {brand.businessName || 'Your Business'}
              </div>
              <div style={{ fontSize: 11, color: settings.accentColor }}>
                {settings.clippyName} is ready to help
              </div>
            </div>
            <div style={{ marginLeft: 'auto', padding: '6px 14px', background: settings.accentColor, color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
              Button
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '13px 0',
            background: saved ? 'var(--accent-light)' : saving ? 'var(--border)' : 'var(--accent)',
            color: saved ? 'var(--accent)' : saving ? 'var(--ink-3)' : 'white',
            border: 'none', borderRadius: 14,
            fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {saved ? '✓ Brand settings saved' : saving ? 'Saving…' : 'Save brand settings'}
        </button>
      </div>
    </div>
  );
}
