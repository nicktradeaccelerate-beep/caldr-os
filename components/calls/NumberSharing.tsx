'use client';

import { useState } from 'react';

type Mode = 'round-robin' | 'simultaneous' | 'priority';

const MOCK_VAS = [
  { id: 1, name: 'VA 1', status: 'online'  as const, calls: 14 },
  { id: 2, name: 'VA 2', status: 'online'  as const, calls: 11 },
  { id: 3, name: 'VA 3', status: 'offline' as const, calls: 3 },
];

const MODE_DESC: Record<Mode, string> = {
  'round-robin':   'Calls rotate between available VAs in order',
  'simultaneous':  'All online VAs ring at the same time — first to answer gets it',
  'priority':      'Calls go to highest priority VA first, then overflow',
};

export default function NumberSharing({ sharedNumber = '+44 7700 900 123' }: { sharedNumber?: string }) {
  const [mode, setMode] = useState<Mode>('round-robin');

  return (
    <div style={{ padding: 16, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Number Sharing</div>
      <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 14 }}>{sharedNumber} shared across team</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['round-robin', 'simultaneous', 'priority'] as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '7px 4px',
            background: mode === m ? 'var(--accent)' : 'var(--white)',
            color: mode === m ? 'white' : 'var(--ink-2)',
            border: `1px solid ${mode === m ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, fontSize: 10, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
          }}>{m}</button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 10 }}>{MODE_DESC[mode]}</div>

      {MOCK_VAS.map((va, i) => (
        <div key={va.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
          {mode === 'priority' && (
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
              {i + 1}
            </div>
          )}
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: va.status === 'online' ? 'var(--accent-mid)' : 'var(--border)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{va.name}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{va.calls} calls today</div>
          </div>
          <span style={{
            background: va.status === 'online' ? 'var(--accent-light)' : 'var(--card)',
            color: va.status === 'online' ? 'var(--accent-mid)' : 'var(--ink-3)',
            padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
          }}>
            {va.status}
          </span>
        </div>
      ))}
    </div>
  );
}
