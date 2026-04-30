'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  leftRail: React.ReactNode;
  centre: React.ReactNode;
  rightPanel: React.ReactNode;
  leftDefaultWidth?: number;
  rightDefaultWidth?: number;
  storageKey?: string;
  topToolbar?: React.ReactNode;
  leftBg?: string;
  centreBg?: string;
}

const MIN_LEFT = 200;
const MAX_LEFT = 440;

export default function ThreeColumnWorkSurface({
  leftRail,
  centre,
  rightPanel,
  leftDefaultWidth = 280,
  rightDefaultWidth = 380,
  storageKey = 'tcs',
  topToolbar,
  leftBg = 'white',
  centreBg = '#F8FAFC',
}: Props) {
  const [leftWidth, setLeftWidth] = useState(leftDefaultWidth);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    try {
      const lw = localStorage.getItem(`${storageKey}:lw`);
      if (lw) setLeftWidth(Math.max(MIN_LEFT, Math.min(MAX_LEFT, parseInt(lw))));
      const rc = localStorage.getItem(`${storageKey}:rc`);
      if (rc !== null) setRightCollapsed(rc === '1');
    } catch {}
  }, [storageKey]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = leftWidth;
    e.preventDefault();
  }, [leftWidth]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const newW = Math.max(MIN_LEFT, Math.min(MAX_LEFT, startWidth.current + (e.clientX - startX.current)));
      setLeftWidth(newW);
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      try { localStorage.setItem(`${storageKey}:lw`, String(leftWidth)); } catch {}
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [storageKey, leftWidth]);

  function toggleRight() {
    const next = !rightCollapsed;
    setRightCollapsed(next);
    try { localStorage.setItem(`${storageKey}:rc`, next ? '1' : '0'); } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      {topToolbar && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid #E2E8F0', background: 'white', zIndex: 10 }}>
          {topToolbar}
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Left rail */}
        <div style={{ width: leftWidth, flexShrink: 0, background: leftBg, borderRight: '1px solid #E2E8F0', overflowY: 'auto', position: 'relative' }}>
          {leftRail}
          {/* Resize handle */}
          <div
            onMouseDown={onDragStart}
            style={{
              position: 'absolute', top: 0, right: -3, bottom: 0, width: 6,
              cursor: 'col-resize', zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              width: 2, height: 40, borderRadius: 1,
              background: 'transparent',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#CBD5E1')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            />
          </div>
        </div>

        {/* Centre */}
        <div style={{ flex: 1, minWidth: 0, background: centreBg, overflowY: 'auto' }}>
          {centre}
        </div>

        {/* Right panel */}
        {rightCollapsed ? (
          <div
            onClick={toggleRight}
            style={{
              width: 36, flexShrink: 0, borderLeft: '1px solid #E2E8F0', background: 'white',
              display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16,
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: '#64748B' }}>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 9, color: '#94A3B8', marginTop: 8, writingMode: 'vertical-lr', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase' }}>
              Guide
            </span>
          </div>
        ) : (
          <div style={{ width: rightDefaultWidth, flexShrink: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Collapse toggle */}
            <button
              onClick={toggleRight}
              title="Collapse panel"
              style={{
                position: 'absolute', top: 14, left: -12, zIndex: 30,
                width: 22, height: 22, borderRadius: '50%',
                background: 'white', border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                padding: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {rightPanel}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
