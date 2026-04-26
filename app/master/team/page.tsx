'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import SupervisorModal from '@/components/calls/SupervisorModal';
import type { User, ActiveCall } from '@/types';

interface VAWithStats extends User {
  todayCalls?: number;
  avgSentiment?: number;
  score?: number;
}

const STATUS_COLOR: Record<string, string> = {
  online:   '#4ADE80',
  'on-call': '#F59E0B',
  offline:  'rgba(255,255,255,0.15)',
};

const PORT_LABELS: Record<string, string> = {
  new:     'Provisioning',
  pending: 'Porting',
  ported:  'Active',
};

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 75 ? '#4ADE80' : score >= 50 ? '#F59E0B' : '#FB7185';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size > 40 ? 13 : 10, fontWeight: 700, color,
      }}>
        {score}
      </div>
    </div>
  );
}

// Demo VAs — replaced by live Supabase data
const DEMO_VAS: VAWithStats[] = [
  { id: '1', business_id: 'b1', name: 'Sarah Mitchell', email: 'sarah@demo.com', role: 'va', uk_number: '+44 207 000 001', twilio_sip_username: 'sarah', twilio_sip_password: '', port_status: 'ported', pac_code: null, status: 'on-call', hearts_total: 14, level: 3, streak: 7, ai_usage: { claude: 3, gpt: 5, gemini: 2 }, created_at: '', todayCalls: 12, avgSentiment: 84, score: 87 },
  { id: '2', business_id: 'b1', name: 'James Okafor', email: 'james@demo.com', role: 'va', uk_number: '+44 161 000 001', twilio_sip_username: 'james', twilio_sip_password: '', port_status: 'ported', pac_code: null, status: 'online', hearts_total: 9, level: 2, streak: 3, ai_usage: { claude: 1, gpt: 2, gemini: 0 }, created_at: '', todayCalls: 8, avgSentiment: 71, score: 72 },
  { id: '3', business_id: 'b1', name: 'Priya Nair', email: 'priya@demo.com', role: 'va', uk_number: null, twilio_sip_username: null, twilio_sip_password: '', port_status: 'pending', pac_code: null, status: 'offline', hearts_total: 5, level: 1, streak: 0, ai_usage: { claude: 0, gpt: 0, gemini: 0 }, created_at: '', todayCalls: 0, avgSentiment: 0, score: 0 },
];

export default function TeamPage() {
  const [vas, setVas] = useState<VAWithStats[]>(DEMO_VAS);
  const [supervisorTarget, setSupervisorTarget] = useState<VAWithStats | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setLoading(true);
    supabase.from('users').select('*').eq('role', 'va').then(({ data }) => {
      if (data && data.length > 0) setVas(data as VAWithStats[]);
      setLoading(false);
    });
  }, []);

  const demoActiveCall: ActiveCall = {
    vaName: supervisorTarget?.name ?? '',
    contactName: 'David Chen',
    area: 'Central London',
    durationMins: 4,
    sentiment: 82,
    intent: 'Interested in quote',
    callSid: 'demo-call-sid',
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.4px', marginBottom: 4 }}>Team</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          {vas.filter(v => v.status !== 'offline').length} active · {vas.filter(v => v.status === 'on-call').length} on call
        </div>
      </div>

      {supervisorTarget && (
        <SupervisorModal
          call={demoActiveCall}
          supervisorNumber="+44 7700 900 000"
          businessId="demo"
          onClose={() => setSupervisorTarget(null)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(loading ? DEMO_VAS : vas).map(va => (
          <div key={va.id} style={{
            padding: '14px 18px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {/* Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, color: '#A5B4FC', flexShrink: 0,
            }}>
              {va.name.charAt(0)}
            </div>

            {/* Name + status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{va.name}</div>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: STATUS_COLOR[va.status] ?? 'rgba(255,255,255,0.15)',
                  boxShadow: va.status === 'on-call' ? '0 0 0 3px rgba(245,158,11,0.2)' : va.status === 'online' ? '0 0 0 3px rgba(74,222,128,0.15)' : 'none',
                }}/>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>{va.status.replace('-', ' ')}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                <span>{va.uk_number ?? 'No number'}</span>
                <span>·</span>
                <span style={{ color: va.port_status === 'ported' ? '#4ADE80' : 'rgba(255,255,255,0.3)' }}>
                  {PORT_LABELS[va.port_status] ?? va.port_status}
                </span>
                {(va.todayCalls ?? 0) > 0 && <><span>·</span><span>{va.todayCalls} calls · {va.avgSentiment}% sentiment</span></>}
              </div>
            </div>

            {/* Hearts + streak */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 13, color: '#FB7185', fontWeight: 700 }}>{'♥'.repeat(Math.min(3, Math.ceil(va.hearts_total / 5)))}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>L{va.level} · 🔥{va.streak}</div>
            </div>

            {/* Score ring */}
            {(va.score ?? 0) > 0 && <ScoreRing score={va.score!} />}

            {/* Supervise button — only on active call */}
            {va.status === 'on-call' ? (
              <button
                onClick={() => setSupervisorTarget(va)}
                style={{
                  padding: '7px 14px', flexShrink: 0,
                  background: 'rgba(245,158,11,0.15)', color: '#F59E0B',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Supervise
              </button>
            ) : (
              <Link href="/master/library" style={{
                padding: '7px 14px', flexShrink: 0,
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none',
              }}>
                Library
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
