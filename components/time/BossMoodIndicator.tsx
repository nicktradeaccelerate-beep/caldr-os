'use client';

import ClippyCharacter from '@/components/clippy/ClippyCharacter';
import type { ClippyMood } from '@/components/clippy/ClippyCharacter';

interface Props {
  efficiency: number;
  tasksComplete: number;
  tasksTotal: number;
}

type MoodKey = 'great' | 'good' | 'neutral' | 'needs_attention';

const MOOD_CONFIG: Record<MoodKey, { label: string; color: string; bg: string; emoji: string; clippy: ClippyMood }> = {
  great:          { label: 'On fire today 🔥', color: '#065F46', bg: '#D1FAE5', emoji: '🟢', clippy: 'celebrating' },
  good:           { label: 'Good progress',    color: 'var(--accent)', bg: 'var(--accent-light)', emoji: '🟢', clippy: 'happy' },
  neutral:        { label: 'Getting there',    color: '#92400E', bg: '#FEF3C7', emoji: '🟡', clippy: 'thinking' },
  needs_attention:{ label: 'Needs a nudge',    color: 'var(--rose)', bg: 'var(--rose-light)', emoji: '🔴', clippy: 'worried' },
};

export default function BossMoodIndicator({ efficiency, tasksComplete, tasksTotal }: Props) {
  const pct = (tasksComplete / tasksTotal) * 100;
  const key: MoodKey =
    efficiency >= 90 && pct >= 60 ? 'great' :
    efficiency >= 75 && pct >= 40 ? 'good'  :
    efficiency >= 60              ? 'neutral' :
    'needs_attention';

  const mc = MOOD_CONFIG[key];

  return (
    <div style={{
      padding: '12px 16px',
      background: mc.bg,
      borderRadius: 14,
      border: `1px solid ${mc.color}20`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ fontSize: 20 }}>{mc.emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: mc.color }}>{mc.label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{tasksComplete}/{tasksTotal} tasks · {efficiency}% efficiency</div>
      </div>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `${mc.color}20`,
        border: `2px solid ${mc.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ClippyCharacter mood={mc.clippy} size={22} />
      </div>
    </div>
  );
}
