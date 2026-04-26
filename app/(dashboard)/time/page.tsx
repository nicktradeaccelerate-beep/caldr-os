'use client';

import { useState } from 'react';
import ShiftClock from '@/components/time/ShiftClock';
import BossMoodIndicator from '@/components/time/BossMoodIndicator';
import HeartDecay from '@/components/time/HeartDecay';
import InvoiceGenerator from '@/components/time/InvoiceGenerator';
import MilestonesAndFamily from '@/components/time/MilestonesAndFamily';

const TABS = ['Overview', 'Milestones', 'Invoice'] as const;
type Tab = typeof TABS[number];

export default function TimePage() {
  const [tab, setTab] = useState<Tab>('Overview');
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>Time Tracker</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Shift clock · Hearts · Boss updates</div>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, color: tab === t ? 'var(--accent)' : 'var(--ink-2)', fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer' }}>{t}</button>
        ))}
      </div>
      {tab === 'Overview' && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><BossMoodIndicator efficiency={87} tasksComplete={4} tasksTotal={6} /><ShiftClock /><HeartDecay /></div>}
      {tab === 'Milestones' && <div style={{ background: 'var(--white)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', minHeight: 400 }}><MilestonesAndFamily /></div>}
      {tab === 'Invoice' && <InvoiceGenerator />}
    </div>
  );
}
