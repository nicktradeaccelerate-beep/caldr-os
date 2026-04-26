'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CaldrNumber, User } from '@/types';

interface NumberWithUser extends CaldrNumber {
  user?: User;
}

interface FeatureToggles {
  recording: boolean;
  transcription: boolean;
  voicemail: boolean;
}

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<NumberWithUser[]>([]);
  const [vas, setVas] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [selectedVA, setSelectedVA] = useState('');
  const [numType, setNumType] = useState<'mobile' | 'landline'>('mobile');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const { data: u } = await supabase.from('users').select('business_id').eq('id', data.user.id).single();
      if (!u?.business_id) { setLoading(false); return; }
      setBusinessId(u.business_id);

      const [{ data: nums }, { data: vaList }] = await Promise.all([
        supabase.from('numbers').select('*').eq('business_id', u.business_id),
        supabase.from('users').select('*').eq('business_id', u.business_id).eq('role', 'va'),
      ]);

      const numData = (nums ?? []) as CaldrNumber[];
      const vaData = (vaList ?? []) as User[];
      setVas(vaData);

      // Join numbers with users
      const joined: NumberWithUser[] = numData.map(n => ({
        ...n,
        user: vaData.find(v => v.id === n.user_id),
      }));
      setNumbers(joined);
      setLoading(false);
    });
  }, []);

  async function provision() {
    if (!selectedVA || !businessId) return;
    setProvisioning(true);
    try {
      const res = await fetch('/api/twilio/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedVA, businessId, type: numType }),
      });
      const data = await res.json() as { number?: string; error?: string };
      if (data.number) {
        // Refresh list
        const { data: nums } = await supabase.from('numbers').select('*').eq('business_id', businessId);
        const joined: NumberWithUser[] = (nums ?? []).map((n: CaldrNumber) => ({
          ...n,
          user: vas.find(v => v.id === n.user_id),
        }));
        setNumbers(joined);
        setSelectedVA('');
      }
    } catch { /* silent */ }
    setProvisioning(false);
  }

  async function toggleFeature(numberId: string, feature: keyof FeatureToggles, current: boolean) {
    const num = numbers.find(n => n.id === numberId);
    if (!num) return;
    const newFeatures = { ...num.features, [feature]: !current };
    await supabase.from('numbers').update({ features: newFeatures }).eq('id', numberId);
    setNumbers(prev => prev.map(n => n.id === numberId ? { ...n, features: newFeatures } : n));
  }

  const STATUS_COLOR: Record<string, string> = { active: 'var(--accent-mid)', suspended: 'var(--rose)' };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>Numbers</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Provision and manage UK numbers per VA</div>
      </div>

      {/* Provision form */}
      <div style={{
        padding: '16px 18px', background: 'var(--white)',
        borderRadius: 14, border: '1px solid var(--border)', marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Add a number</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Assign to VA</div>
            <select
              value={selectedVA}
              onChange={e => setSelectedVA(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, fontSize: 13, color: 'var(--ink)', outline: 'none',
              }}
            >
              <option value="">Select VA…</option>
              {vas.filter(v => !numbers.some(n => n.user_id === v.id)).map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>Type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['mobile', 'landline'] as const).map(t => (
                <button key={t} onClick={() => setNumType(t)} style={{
                  padding: '9px 14px',
                  background: numType === t ? 'var(--accent-light)' : 'var(--card)',
                  color: numType === t ? 'var(--accent)' : 'var(--ink-2)',
                  border: `1px solid ${numType === t ? 'var(--accent-light)' : 'var(--border)'}`,
                  borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  textTransform: 'capitalize',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={provision}
            disabled={!selectedVA || provisioning}
            style={{
              padding: '9px 18px',
              background: !selectedVA || provisioning ? 'var(--border)' : 'var(--accent)',
              color: !selectedVA || provisioning ? 'var(--ink-3)' : 'white',
              border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: !selectedVA || provisioning ? 'default' : 'pointer',
            }}
          >
            {provisioning ? 'Provisioning…' : 'Provision number'}
          </button>
        </div>
      </div>

      {/* Numbers table */}
      {loading ? (
        <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13, textAlign: 'center' }}>Loading…</div>
      ) : numbers.length === 0 ? (
        <div style={{ padding: 32, background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>
          No numbers provisioned yet. Add one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {numbers.map(num => {
            const feats = num.features ?? { recording: false, transcription: false, voicemail: false };
            return (
              <div key={num.id} style={{
                padding: '14px 18px', background: 'var(--white)',
                borderRadius: 14, border: '1px solid var(--border)',
              }}>
                {/* Number row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'DM Mono, monospace', marginBottom: 2 }}>
                      {num.number}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      {num.user?.name ?? 'Unassigned'} · {num.type} · Twilio SID: {num.twilio_sid.slice(0, 12)}…
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: num.status === 'active' ? 'var(--accent-light)' : 'var(--rose-light)',
                    color: STATUS_COLOR[num.status] ?? 'var(--ink-2)',
                  }}>
                    {num.status}
                  </span>
                  {num.whatsapp_verified && (
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(37,211,102,0.1)', color: '#25D366' }}>
                      WhatsApp ✓
                    </span>
                  )}
                </div>

                {/* Feature toggles */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {(Object.entries({ recording: 'Recording', transcription: 'Transcription', voicemail: 'Voicemail' }) as [keyof FeatureToggles, string][]).map(([feat, label]) => {
                    const enabled = feats[feat] ?? false;
                    return (
                      <button
                        key={feat}
                        onClick={() => toggleFeature(num.id, feat, enabled)}
                        style={{
                          padding: '6px 12px',
                          background: enabled ? 'var(--accent-light)' : 'var(--card)',
                          color: enabled ? 'var(--accent)' : 'var(--ink-3)',
                          border: `1px solid ${enabled ? 'var(--accent-light)' : 'var(--border)'}`,
                          borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {enabled ? '✓' : '○'} {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
