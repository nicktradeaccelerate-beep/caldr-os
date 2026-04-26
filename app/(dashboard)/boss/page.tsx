'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import BossUpdateLog from '@/components/boss/BossUpdateLog';
import DailySummary from '@/components/boss/DailySummary';
import BossSettings from '@/components/boss/BossSettings';
import type { User, Business } from '@/types';

const TABS = ['Live log', 'Daily summary', 'Settings'] as const;
type Tab = typeof TABS[number];

interface UserWithBusiness extends User {
  businesses?: Business;
}

export default function BossPage() {
  const [tab, setTab] = useState<Tab>('Live log');
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const { data: userData } = await supabase
        .from('users')
        .select('*, businesses(*)')
        .eq('id', data.user.id)
        .single();
      if (userData) {
        const u = userData as UserWithBusiness;
        setUser(u as User);
        setBusiness(u.businesses ?? null);
      }
      setLoading(false);
    });
  }, []);

  async function handleSaveSettings(settings: Partial<Business>) {
    if (!business) return;
    await supabase.from('businesses').update(settings).eq('id', business.id);
    setBusiness(prev => prev ? { ...prev, ...settings } : prev);
  }

  if (loading) return (
    <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
  );

  // Demo fallback when not authenticated (dev mode)
  const demoBusiness: Business = business ?? {
    id: 'demo', name: 'Demo Business', short_name: 'Demo',
    accent_color: '#1B4332', logo_url: null, knowledge: null,
    objections: {}, plan: 'starter', stripe_customer_id: null,
    stripe_subscription_id: null, notifyWhatsApp: false, notifyEmail: false,
    crm_integration: 'none',
    created_at: new Date().toISOString(),
  };

  const demoUser: User = user ?? {
    id: 'demo', business_id: 'demo', name: 'You', email: 'you@demo.com',
    role: 'va', uk_number: null, twilio_sip_username: null, twilio_sip_password: null,
    port_status: 'new', pac_code: null, status: 'online',
    hearts_total: 0, level: 1, streak: 0,
    ai_usage: { claude: 0, gpt: 0, gemini: 0 }, created_at: new Date().toISOString(),
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>Boss Updates</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Real-time WhatsApp &amp; email updates · Daily summary · Controls
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20,
        padding: '10px 14px',
        background: demoBusiness.notifyWhatsApp || demoBusiness.notifyEmail ? 'var(--accent-pale)' : 'var(--card)',
        borderRadius: 12,
        border: `1px solid ${demoBusiness.notifyWhatsApp || demoBusiness.notifyEmail ? 'var(--accent-light)' : 'var(--border)'}`,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
          background: demoBusiness.notifyWhatsApp || demoBusiness.notifyEmail ? 'var(--accent-mid)' : 'var(--border)',
        }}/>
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>
          {demoBusiness.notifyWhatsApp || demoBusiness.notifyEmail
            ? `Notifications active — ${[demoBusiness.notifyWhatsApp && 'WhatsApp', demoBusiness.notifyEmail && 'Email'].filter(Boolean).join(' & ')}`
            : 'Notifications off — configure in Settings to enable'}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 16px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            color: tab === t ? 'var(--accent)' : 'var(--ink-2)',
            fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: 'var(--white)', borderRadius: '0 0 16px 16px', border: '1px solid var(--border)', borderTop: 'none' }}>
        {tab === 'Live log' && (
          <BossUpdateLog businessId={demoBusiness.id} />
        )}
        {tab === 'Daily summary' && (
          <DailySummary
            vaId={demoUser.id}
            vaName={demoUser.name}
            businessId={demoBusiness.id}
          />
        )}
        {tab === 'Settings' && (
          <BossSettings
            business={demoBusiness}
            onSave={handleSaveSettings}
          />
        )}
      </div>
    </div>
  );
}
