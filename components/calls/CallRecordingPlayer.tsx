'use client';

import { useState, useRef, useEffect } from 'react';

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

interface Props {
  duration?: number; // seconds
  recordingUrl?: string;
}

export default function CallRecordingPlayer({ duration = 394, recordingUrl }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function toggle() {
    if (playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= duration) {
            if (timerRef.current) clearInterval(timerRef.current);
            setPlaying(false);
            return 0;
          }
          return e + 1;
        });
        setProgress(p => Math.min(p + (100 / duration), 100));
      }, 1000);
    }
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setProgress(pct * 100);
    setElapsed(Math.floor(pct * duration));
  }

  // Deterministic waveform heights based on index
  const bars = Array.from({ length: 60 }, (_, i) => 8 + Math.sin(i * 0.8) * 12 + (i % 7) * 1.1);

  return (
    <div style={{ padding: '14px 16px', background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        🎙 Recording
      </div>

      {/* Waveform */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 40, marginBottom: 12, overflow: 'hidden' }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            flex: 1, height: `${h}px`, borderRadius: 2,
            background: (i / 60) * 100 <= progress ? 'var(--accent)' : 'var(--border)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Scrub bar */}
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 10, cursor: 'pointer' }} onClick={seek}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 0.5s linear' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>{fmt(elapsed)}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => setElapsed(e => Math.max(0, e - 15))} style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', fontSize: 13 }}>⟪ 15</button>
          <button onClick={toggle} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', border: 'none', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={() => setElapsed(e => Math.min(duration, e + 15))} style={{ background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer', fontSize: 13 }}>15 ⟫</button>
        </div>
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>{fmt(duration)}</span>
      </div>
    </div>
  );
}
