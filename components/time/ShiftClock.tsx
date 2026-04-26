'use client';

import { useState, useEffect, useRef } from 'react';

function haptic(pattern: 'complete' | 'start' = 'start') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern === 'complete' ? [50, 30, 50] : [40]);
  }
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch {}
}

const RATE = 8.5; // £/hour — will come from business config

export default function ShiftClock() {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [start, setStart] = useState<Date | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startShift = () => {
    setActive(true);
    setStart(new Date());
    setSeconds(0);
    haptic('start');
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const endShift = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActive(false);
    setOnBreak(false);
    haptic('complete');
    playChime();
  };

  const toggleBreak = () => {
    if (!onBreak) {
      setOnBreak(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setOnBreak(false);
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const earned = ((seconds / 3600) * RATE).toFixed(2);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div style={{
      padding: '16px 20px',
      background: active ? 'var(--accent-pale)' : 'var(--card)',
      borderRadius: 18,
      border: `1px solid ${active ? 'var(--accent-light)' : 'var(--border)'}`,
      marginBottom: 16,
      transition: 'all 0.3s',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        {active ? (onBreak ? '⏸ On break' : '● Shift active') : 'Shift clock'}
      </div>

      {active ? (
        <>
          <div style={{ fontSize: 48, fontWeight: 200, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 4 }}>
            {pad(h)}:{pad(m)}:{pad(s)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
            Started {start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Earned £{earned}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={toggleBreak} style={{ flex: 1, padding: 10, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer' }}>
              {onBreak ? '▶ Resume' : '⏸ Break'}
            </button>
            <button onClick={endShift} style={{ flex: 1, padding: 10, background: 'var(--rose)', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              End shift
            </button>
          </div>
        </>
      ) : (
        <>
          {seconds > 0 && (
            <div style={{ padding: '10px 14px', background: 'var(--white)', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 12, fontSize: 13, color: 'var(--ink)' }}>
              Last shift: {pad(h)}h {pad(m)}m · £{earned} logged
            </div>
          )}
          <button onClick={startShift} style={{ width: '100%', padding: 13, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            ☀ Start shift
          </button>
        </>
      )}
    </div>
  );
}
