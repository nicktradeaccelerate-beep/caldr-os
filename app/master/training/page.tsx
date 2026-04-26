'use client';

type FlagKey = 'price objection' | 'long silence' | 'low sentiment' | 'callback needed';
type VAFlags = Record<FlagKey, number>;

const VAS: { name: string; score: number; calls: number; avgSentiment: number; streak: number; hearts: number; flags: VAFlags }[] = [
  { name: 'Sarah Mitchell', score: 87, calls: 12, avgSentiment: 84, streak: 7,  hearts: 14, flags: { 'price objection': 1, 'long silence': 0, 'low sentiment': 1, 'callback needed': 2 } },
  { name: 'Tom Barnes',     score: 82, calls: 9,  avgSentiment: 79, streak: 5,  hearts: 11, flags: { 'price objection': 2, 'long silence': 1, 'low sentiment': 0, 'callback needed': 1 } },
  { name: 'Emma Clarke',    score: 91, calls: 11, avgSentiment: 89, streak: 12, hearts: 18, flags: { 'price objection': 0, 'long silence': 0, 'low sentiment': 0, 'callback needed': 1 } },
  { name: 'James Okafor',   score: 72, calls: 8,  avgSentiment: 71, streak: 3,  hearts: 9,  flags: { 'price objection': 3, 'long silence': 2, 'low sentiment': 2, 'callback needed': 3 } },
  { name: 'Priya Nair',     score: 0,  calls: 0,  avgSentiment: 0,  streak: 0,  hearts: 5,  flags: { 'price objection': 0, 'long silence': 0, 'low sentiment': 0, 'callback needed': 0 } },
];

const FLAGS: FlagKey[] = ['price objection', 'long silence', 'low sentiment', 'callback needed'];

const RUBRIC = [
  { criterion: 'Opening quality', weight: 20, desc: 'Warm, specific, creates curiosity' },
  { criterion: 'Qualification', weight: 20, desc: 'Asks the right 3 questions early' },
  { criterion: 'Objection handling', weight: 25, desc: 'Uses social proof + specific closes' },
  { criterion: 'Sentiment score', weight: 25, desc: 'Contact engagement throughout call' },
  { criterion: 'Close attempt', weight: 10, desc: 'Specific next step agreed before hang-up' },
];

function heatColor(val: number, max: number): string {
  if (max === 0 || val === 0) return 'rgba(255,255,255,0.04)';
  const intensity = val / max;
  const r = Math.round(225 * intensity);
  const g = Math.round(29 * intensity);
  const b = Math.round(72 * intensity);
  return `rgba(${r},${g},${b},${0.15 + intensity * 0.25})`;
}

const sortedVas = [...VAS].sort((a, b) => b.score - a.score);
const maxFlags = Object.fromEntries(FLAGS.map(f => [f, Math.max(...VAS.map(v => v.flags[f] ?? 0))]));

export default function TrainingPage() {
  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.4px', marginBottom: 4 }}>Training</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>VA rankings · Flag patterns · Scoring rubric</div>
      </div>

      {/* Rankings */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Performance rankings
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedVas.map((va, rank) => (
            <div key={va.name} style={{
              padding: '12px 16px', background: 'rgba(255,255,255,0.04)',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: rank === 0 ? 'rgba(245,158,11,0.2)' : rank === 1 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: rank === 0 ? '#F59E0B' : rank === 1 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)',
              }}>
                {rank + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 3 }}>{va.name}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  <span>{va.calls} calls</span>
                  <span>· {va.avgSentiment}% avg sentiment</span>
                  <span>· 🔥{va.streak} day streak</span>
                  <span>· {va.hearts}♥ hearts</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 200, color: va.score >= 75 ? '#4ADE80' : va.score >= 50 ? '#F59E0B' : '#FB7185', letterSpacing: '-0.03em' }}>
                  {va.score || '—'}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>/100</div>
              </div>
              {/* Mini bar */}
              <div style={{ width: 80, flexShrink: 0 }}>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${va.score}%`, height: '100%', borderRadius: 2,
                    background: va.score >= 75 ? '#4ADE80' : va.score >= 50 ? '#F59E0B' : '#FB7185',
                    transition: 'width 0.5s ease',
                  }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flag heatmap */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Flag pattern heatmap
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${FLAGS.length}, 1fr)`, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>VA</div>
            {FLAGS.map(f => (
              <div key={f} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'capitalize', textAlign: 'center' }}>{f}</div>
            ))}
          </div>
          {VAS.filter(va => va.calls > 0).map((va, i) => (
            <div key={va.name} style={{
              display: 'grid', gridTemplateColumns: `160px repeat(${FLAGS.length}, 1fr)`,
              padding: '10px 16px',
              borderBottom: i < VAS.filter(v => v.calls > 0).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{va.name}</div>
              {FLAGS.map(flag => {
                const val = va.flags[flag] ?? 0;
                const bg = heatColor(val, maxFlags[flag]);
                return (
                  <div key={flag} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '8px 4px',
                  }}>
                    <div style={{
                      width: 40, height: 28, borderRadius: 6,
                      background: bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                      color: val > 0 ? '#FB7185' : 'rgba(255,255,255,0.15)',
                    }}>
                      {val || '·'}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Scoring rubric */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Scoring rubric
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RUBRIC.map(r => (
            <div key={r.criterion} style={{
              padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: '#818CF8',
              }}>
                {r.weight}%
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2 }}>{r.criterion}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
