'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PLAN_FEATURES, hasFeature } from '@/lib/brand/features';
import type { PlanId } from '@/types';

const PLAN_DETAILS = {
  starter: {
    name: 'Starter',
    price: '£12',
    period: '/seat/mo',
    color: '#40916C',
    bg: 'rgba(64,145,108,0.08)',
    border: 'rgba(64,145,108,0.2)',
    tagline: 'UK VoIP number · calls · tasks',
  },
  professional: {
    name: 'Professional',
    price: '£19',
    period: '/seat/mo',
    color: '#1B4332',
    bg: 'rgba(27,67,50,0.08)',
    border: 'rgba(27,67,50,0.2)',
    tagline: 'Everything + recording · sentiment · time tracker',
  },
  intelligence: {
    name: 'Intelligence',
    price: '£35',
    period: '/seat/mo',
    color: '#6D28D9',
    bg: 'rgba(109,40,217,0.08)',
    border: 'rgba(109,40,217,0.2)',
    tagline: 'Everything + live coaching · intent · supervisor',
  },
  os: {
    name: 'Caldr OS',
    price: '£29',
    period: '/seat/mo',
    color: '#0F0E1A',
    bg: 'rgba(15,14,26,0.06)',
    border: 'rgba(15,14,26,0.15)',
    tagline: 'Full OS · AI hub · code env · white-label',
  },
} as const;

const FEATURE_LABELS: Record<string, string> = {
  calls: 'VoIP calling', tasks: 'Task manager', inbound: 'Unlimited inbound',
  outbound_500: '500 outbound mins/mo', voicemail_email: 'Voicemail to email',
  recording: 'Call recording', transcription: 'AI transcription',
  sentiment: 'Sentiment analysis', crm_log: 'CRM logging',
  time_tracker: 'Shift clock & hearts', clippy: 'Clippy AI assistant',
  boss_updates: 'Boss WhatsApp & email', intent_detection: 'Live intent signals',
  live_coaching: 'Real-time coaching', pre_call_brief: 'Pre-call AI brief',
  post_call_debrief: 'Post-call debrief', supervisor: 'Listen/whisper/barge',
  call_map: 'Geographic call map', ai_hub: 'Multi-model AI hub',
  code_env: 'Code environment', daily_brief: 'Morning AI briefing',
  master_view: 'Manager dashboard', white_label: 'Brand customisation',
  api_access: 'API & integrations',
};

interface BusinessRow {
  id: string;
  plan: PlanId;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export default function BillingPage() {
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const { data: u } = await supabase.from('users').select('business_id').eq('id', data.user.id).single();
      if (!u?.business_id) { setLoading(false); return; }
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, plan, stripe_customer_id, stripe_subscription_id')
        .eq('id', u.business_id)
        .single();
      setBusiness(biz as BusinessRow ?? null);
      setLoading(false);
    });
  }, []);

  async function checkout(planId: PlanId) {
    if (!business) return;
    setCheckoutLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, planId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch { /* silent */ }
    setCheckoutLoading(null);
  }

  async function openPortal() {
    if (!business) return;
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch { /* silent */ }
    setPortalLoading(false);
  }

  const currentPlan = (business?.plan ?? 'starter') as PlanId;
  const currentFeatures = PLAN_FEATURES[currentPlan] as readonly string[];
  const isSubscribed = !!business?.stripe_subscription_id;

  if (loading) return <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>Billing</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Manage your plan and subscription</div>
      </div>

      {/* Current plan banner */}
      {isSubscribed && (
        <div style={{
          padding: '14px 18px', marginBottom: 24,
          background: 'var(--accent-pale)', borderRadius: 14,
          border: '1px solid var(--accent-light)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Active plan</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{PLAN_DETAILS[currentPlan].name}</div>
          </div>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            style={{
              padding: '9px 18px',
              background: portalLoading ? 'var(--border)' : 'var(--accent)',
              color: 'white', border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: portalLoading ? 'default' : 'pointer',
            }}
          >
            {portalLoading ? 'Opening…' : 'Manage in Stripe portal'}
          </button>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28 }}>
        {(Object.keys(PLAN_DETAILS) as PlanId[]).map(planId => {
          const p = PLAN_DETAILS[planId];
          const isCurrent = currentPlan === planId;
          const planFeats = PLAN_FEATURES[planId] as readonly string[];
          return (
            <div key={planId} style={{
              padding: '16px 18px',
              background: isCurrent ? p.bg : 'var(--white)',
              borderRadius: 14,
              border: `1.5px solid ${isCurrent ? p.border : 'var(--border)'}`,
            }}>
              {isCurrent && (
                <div style={{ fontSize: 10, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Current plan</div>
              )}
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: p.color }}>{p.price}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.period}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 14, lineHeight: 1.5 }}>{p.tagline}</div>

              {/* Feature list (first 5) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                {planFeats.slice(0, 5).map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-2)' }}>
                    <span style={{ color: p.color, fontSize: 10 }}>✓</span>
                    {FEATURE_LABELS[f] ?? f}
                  </div>
                ))}
                {planFeats.length > 5 && (
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>+{planFeats.length - 5} more…</div>
                )}
              </div>

              {!isCurrent && (
                <button
                  onClick={() => checkout(planId)}
                  disabled={!!checkoutLoading}
                  style={{
                    width: '100%', padding: '10px 0',
                    background: checkoutLoading === planId ? 'var(--border)' : p.color,
                    color: 'white', border: 'none', borderRadius: 10,
                    fontSize: 13, fontWeight: 600, cursor: checkoutLoading ? 'default' : 'pointer',
                  }}
                >
                  {checkoutLoading === planId ? 'Redirecting…' : isSubscribed ? 'Switch plan' : 'Start free trial'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature gate status */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Your feature access
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {Object.keys(FEATURE_LABELS).map(f => {
            const enabled = hasFeature(currentPlan, f as never);
            return (
              <div key={f} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 10px', borderRadius: 8,
                background: enabled ? 'var(--accent-pale)' : 'var(--card)',
                border: `1px solid ${enabled ? 'var(--accent-light)' : 'var(--border)'}`,
                fontSize: 11,
                color: enabled ? 'var(--accent)' : 'var(--ink-3)',
                opacity: enabled ? 1 : 0.6,
              }}>
                <span style={{ fontSize: 10 }}>{enabled ? '✓' : '○'}</span>
                {FEATURE_LABELS[f]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
