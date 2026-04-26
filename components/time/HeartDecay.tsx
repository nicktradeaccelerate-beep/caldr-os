'use client';

interface HeartEntry {
  id: number;
  earned: string;
  decay: number;
}

const MOCK_HEARTS: HeartEntry[] = [
  { id: 1, earned: '2h ago',     decay: 95 },
  { id: 2, earned: '4h ago',     decay: 72 },
  { id: 3, earned: 'Yesterday',  decay: 38 },
  { id: 4, earned: '2 days ago', decay: 12 },
];

export default function HeartDecay({ hearts = MOCK_HEARTS }: { hearts?: HeartEntry[] }) {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--rose-light)', borderRadius: 14, border: '1px solid rgba(225,29,72,0.12)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose)', marginBottom: 4 }}>Heart health</div>
      <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 14 }}>
        Hearts fade if you stop earning — keep completing tasks to keep them glowing
      </div>
      {hearts.map(h => (
        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 18, opacity: h.decay / 100, filter: `saturate(${h.decay}%)`, transition: 'all 0.5s' }}>♥</div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${h.decay}%`, height: '100%', borderRadius: 3,
                background: h.decay > 60 ? 'var(--rose)' : h.decay > 30 ? '#92400E' : 'var(--ink-3)',
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)', minWidth: 60 }}>{h.earned}</div>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: h.decay > 60 ? 'var(--rose)' : h.decay > 30 ? '#92400E' : 'var(--ink-3)',
          }}>
            {h.decay}%
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 8, padding: '8px 10px', background: 'var(--white)', borderRadius: 8 }}>
        💡 Complete a task now to restore your fading hearts
      </div>
    </div>
  );
}
