'use client';

import { useState } from 'react';
import ClippyCharacter from '@/components/clippy/ClippyCharacter';

interface FamilyMember {
  id: number;
  name: string;
  relation: string;
  birthday: string;
  note: string;
}

interface Milestone {
  icon: string;
  label: string;
  date: string;
  achieved: boolean;
  progress?: number;
}

const DEFAULT_MILESTONES: Milestone[] = [
  { icon: '🎉', label: 'First call completed',  date: '1 Jan 2026',     achieved: true },
  { icon: '💛', label: '10 hearts earned',       date: '3 Jan 2026',     achieved: true },
  { icon: '📞', label: '50 calls logged',        date: '15 Jan 2026',    achieved: true },
  { icon: '🌸', label: 'Level 2 — Bloomer',     date: '28 Jan 2026',    achieved: true },
  { icon: '🔥', label: '7-day streak',           date: 'In progress',    achieved: false, progress: 5 },
  { icon: '💚', label: '100 calls logged',       date: '45 calls to go', achieved: false, progress: 55 },
  { icon: '🎂', label: '3 months with team',     date: '1 Apr 2026',     achieved: false, progress: 85 },
];

const DEFAULT_FAMILY: FamilyMember[] = [
  { id: 1, name: 'Thandiwe', relation: 'Daughter', birthday: '2018-03-15', note: 'Loves dinosaurs' },
  { id: 2, name: 'Sipho',    relation: 'Son',      birthday: '2020-07-22', note: 'Started walking!' },
  { id: 3, name: 'Nomsa',   relation: 'Mum',      birthday: '1965-11-08', note: 'Lives in Durban' },
];

const EMPTY_PERSON = { name: '', relation: '', birthday: '', note: '' };

export default function MilestonesAndFamily() {
  const [tab, setTab] = useState<'milestones' | 'family'>('milestones');
  const [family, setFamily] = useState<FamilyMember[]>(DEFAULT_FAMILY);
  const [adding, setAdding] = useState(false);
  const [newPerson, setNewPerson] = useState(EMPTY_PERSON);

  const upcomingBirthdays = family.filter(f => {
    const bd = new Date(f.birthday);
    const today = new Date();
    const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    return Math.ceil((next.getTime() - today.getTime()) / 86400000) <= 30;
  });

  function addMember() {
    if (!newPerson.name) return;
    setFamily(f => [...f, { id: Date.now(), ...newPerson }]);
    setAdding(false);
    setNewPerson(EMPTY_PERSON);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['milestones', 'family'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 14px', background: 'transparent', border: 'none',
            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            color: tab === t ? 'var(--accent)' : 'var(--ink-3)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'milestones' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ padding: '12px 14px', background: 'var(--accent-pale)', borderRadius: 12, border: '1px solid var(--accent-light)', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <ClippyCharacter mood="celebrating" size={40} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>Keep collecting milestones! 🎉</div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>Pip is watching and celebrating every one.</div>
            </div>
          </div>

          {DEFAULT_MILESTONES.map(m => (
            <div key={m.label} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 20, opacity: m.achieved ? 1 : 0.4 }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: m.achieved ? 'var(--ink)' : 'var(--ink-2)', fontWeight: m.achieved ? 600 : 400, marginBottom: m.progress !== undefined && !m.achieved ? 4 : 0 }}>
                  {m.label}
                </div>
                {m.progress !== undefined && !m.achieved && (
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${m.progress}%`, height: '100%', background: 'var(--accent-mid)', borderRadius: 2 }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: m.achieved ? 'var(--accent-mid)' : 'var(--ink-3)', textAlign: 'right' }}>
                {m.achieved ? '✓ ' : ''}{m.date}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'family' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 14 }}>
            Pip remembers your family so your boss can ask about them personally. Makes every check-in feel human.
          </div>

          {upcomingBirthdays.length > 0 && (
            <div style={{ padding: '10px 14px', background: '#FFFBEB', borderRadius: 12, border: '1px solid #FEF3C7', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>🎂 Coming up</div>
              {upcomingBirthdays.map(f => (
                <div key={f.id} style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                  {f.name}'s birthday — {new Date(f.birthday).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                </div>
              ))}
            </div>
          )}

          {family.map(f => (
            <div key={f.id} style={{ padding: '12px 14px', background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{f.name}</div>
                <span style={{ background: '#F3E8FF', color: '#6B21A8', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{f.relation}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                🎂 {new Date(f.birthday).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              {f.note && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2, fontStyle: 'italic' }}>{f.note}</div>}
            </div>
          ))}

          {!adding ? (
            <button onClick={() => setAdding(true)} style={{ width: '100%', padding: 11, background: 'var(--accent-light)', color: 'var(--accent)', border: '1px dashed var(--accent-mid)', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
              + Add family member
            </button>
          ) : (
            <div style={{ padding: 14, background: 'var(--white)', borderRadius: 14, border: '1px solid var(--border)', marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Add family member</div>
              {([['Name', 'name', 'e.g. Thandiwe'], ['Relationship', 'relation', 'e.g. Daughter'], ['Birthday', 'birthday', 'YYYY-MM-DD'], ['Note', 'note', 'e.g. Loves dinosaurs']] as [string, keyof typeof EMPTY_PERSON, string][]).map(([label, key, ph]) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input value={newPerson[key]} onChange={e => setNewPerson(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--ink)', background: 'var(--card)', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setAdding(false)} style={{ flex: 1, padding: 9, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={addMember} style={{ flex: 2, padding: 9, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
