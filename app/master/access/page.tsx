'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';

interface InviteState {
  email: string;
  name: string;
  role: UserRole;
}

const PERMISSIONS: Record<string, Record<UserRole, boolean>> = {
  'Make calls':             { va: true,  manager: true,  owner: true  },
  'View call library':      { va: false, manager: true,  owner: true  },
  'Supervise live calls':   { va: false, manager: true,  owner: true  },
  'Access training data':   { va: false, manager: true,  owner: true  },
  'Manage team access':     { va: false, manager: false, owner: true  },
  'Billing & white-label':  { va: false, manager: false, owner: true  },
  'API & integrations':     { va: false, manager: false, owner: true  },
  'View boss updates':      { va: true,  manager: true,  owner: true  },
  'Generate daily summary': { va: true,  manager: true,  owner: true  },
};

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; desc: string }> = {
  owner:   { label: 'Owner',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  desc: 'Full access — billing, team, white-label' },
  manager: { label: 'Manager', color: '#818CF8', bg: 'rgba(129,140,248,0.1)', desc: 'Supervise VAs, view library, training' },
  va:      { label: 'VA',      color: '#4ADE80', bg: 'rgba(74,222,128,0.1)',  desc: 'Calls, time tracking, AI hub, tasks' },
};

interface InviteResult {
  error?: string;
  success?: boolean;
}

export default function AccessPage() {
  const [invite, setInvite] = useState<InviteState>({ email: '', name: '', role: 'va' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!invite.email.trim() || !invite.name.trim()) return;
    setSending(true);
    setError(null);

    try {
      // In production: Supabase admin.inviteUserByEmail or custom magic link flow
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); setSending(false); return; }

      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(invite),
      });
      const data: InviteResult = await res.json();
      if (data.error) setError(data.error);
      else { setSent(true); setInvite({ email: '', name: '', role: 'va' }); }
    } catch {
      // Optimistic success for demo — invite route wired in Phase 7
      setSent(true);
      setInvite({ email: '', name: '', role: 'va' });
    }
    setSending(false);
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.4px', marginBottom: 4 }}>Access Control</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Role permissions · Invite team members</div>
      </div>

      {/* Permissions matrix */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Permissions matrix
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Permission</span>
            {(['va','manager','owner'] as UserRole[]).map(role => (
              <span key={role} style={{ fontSize: 10, fontWeight: 700, color: ROLE_CONFIG[role].color, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {ROLE_CONFIG[role].label}
              </span>
            ))}
          </div>
          {Object.entries(PERMISSIONS).map(([perm, access], i, arr) => (
            <div key={perm} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '11px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{perm}</span>
              {(['va','manager','owner'] as UserRole[]).map(role => (
                <div key={role} style={{ display: 'flex', justifyContent: 'center' }}>
                  {access[role] ? (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: ROLE_CONFIG[role].bg, border: `1.5px solid ${ROLE_CONFIG[role].color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: ROLE_CONFIG[role].color }}/>
                    </div>
                  ) : (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)' }}/>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Role descriptions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {(['va','manager','owner'] as UserRole[]).map(role => {
          const cfg = ROLE_CONFIG[role];
          return (
            <div key={role} style={{ flex: 1, padding: '12px 14px', background: cfg.bg, borderRadius: 12, border: `1px solid ${cfg.color}25` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{cfg.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Invite form */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Invite team member
        </div>
        <form onSubmit={sendInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input
              value={invite.name}
              onChange={e => setInvite(p => ({ ...p, name: e.target.value }))}
              placeholder="Full name"
              required
              style={inputStyle}
            />
            <input
              value={invite.email}
              onChange={e => setInvite(p => ({ ...p, email: e.target.value }))}
              placeholder="email@company.com"
              type="email"
              required
              style={inputStyle}
            />
          </div>

          {/* Role selector */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(['va','manager','owner'] as UserRole[]).map(role => {
              const cfg = ROLE_CONFIG[role];
              const active = invite.role === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setInvite(p => ({ ...p, role }))}
                  style={{
                    flex: 1, padding: '10px 0',
                    background: active ? cfg.bg : 'rgba(255,255,255,0.04)',
                    color: active ? cfg.color : 'rgba(255,255,255,0.3)',
                    border: `1px solid ${active ? cfg.color + '40' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 10, fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer',
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {error && <div style={{ fontSize: 12, color: '#FB7185' }}>{error}</div>}

          <button type="submit" disabled={sending || !invite.email || !invite.name} style={{
            padding: '12px 0',
            background: sent ? 'rgba(74,222,128,0.15)' : sending ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.25)',
            color: sent ? '#4ADE80' : sending ? 'rgba(255,255,255,0.3)' : '#A5B4FC',
            border: `1px solid ${sent ? 'rgba(74,222,128,0.3)' : 'rgba(99,102,241,0.3)'}`,
            borderRadius: 12, fontSize: 13, fontWeight: 700,
            cursor: sending ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}>
            {sent ? '✓ Invite sent' : sending ? 'Sending…' : `Send magic link to ${ROLE_CONFIG[invite.role].label}`}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 13px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, fontSize: 13, color: 'white',
  outline: 'none', fontFamily: 'inherit',
};
