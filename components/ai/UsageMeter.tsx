'use client';

import { MODELS } from './ModelSwitcher';
import type { ModelId } from './ModelSwitcher';

interface UsageMeterProps {
  usage: Record<ModelId, number>;
  selected?: ModelId;
}

export default function UsageMeter({ usage, selected }: UsageMeterProps) {
  const totalUsed = Object.values(usage).reduce((s, v) => s + v, 0);
  const totalLimit = MODELS.reduce((s, m) => s + m.dailyLimit, 0);

  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--card)',
      borderRadius: 12,
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Daily AI usage
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>
          {totalUsed}/{totalLimit} calls · resets midnight UTC
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MODELS.map(m => {
          const used = usage[m.id] ?? 0;
          const pct = Math.min(100, (used / m.dailyLimit) * 100);
          const isActive = selected === m.id;
          const isAmber = pct >= 80 && pct < 100;
          const isRed = pct >= 100;
          const barColor = isRed ? 'var(--rose)' : isAmber ? '#F59E0B' : m.color;

          return (
            <div key={m.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isActive ? m.color : 'var(--border)',
                    flexShrink: 0,
                  }}/>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--ink)' : 'var(--ink-2)' }}>
                    {m.name}
                  </span>
                  {isRed && (
                    <span style={{ fontSize: 10, color: 'var(--rose)', fontWeight: 600 }}>LIMIT</span>
                  )}
                  {isAmber && !isRed && (
                    <span style={{ fontSize: 10, color: '#B45309', fontWeight: 600 }}>NEAR LIMIT</span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: isRed ? 'var(--rose)' : isAmber ? '#B45309' : 'var(--ink-3)', fontWeight: 600 }}>
                  {used}/{m.dailyLimit}
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: barColor,
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Switch suggestion */}
      {selected && (usage[selected] ?? 0) >= MODELS.find(m => m.id === selected)!.dailyLimit * 0.8 && (
        <div style={{
          marginTop: 10, padding: '8px 10px',
          background: 'rgba(245,158,11,0.08)',
          borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>
            {usage[selected] >= MODELS.find(m => m.id === selected)!.dailyLimit
              ? `${MODELS.find(m => m.id === selected)!.name} limit reached. Switch to ${
                  MODELS.find(m => m.id !== selected && (usage[m.id] ?? 0) < m.dailyLimit)?.name ?? 'another model'
                } to continue.`
              : `Almost at ${MODELS.find(m => m.id === selected)!.name} limit. Consider switching soon.`
            }
          </div>
        </div>
      )}
    </div>
  );
}
