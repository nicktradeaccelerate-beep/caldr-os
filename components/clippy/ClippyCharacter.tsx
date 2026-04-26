'use client';

import { useState, useEffect } from 'react';

export type ClippyMood = 'neutral' | 'happy' | 'thinking' | 'worried' | 'celebrating';

interface Props {
  mood?: ClippyMood;
  size?: number;
  onClick?: () => void;
}

const MOODS: Record<ClippyMood, { strokeColor: string; eyeColor: string; smile: string; blush: boolean }> = {
  neutral:     { strokeColor: '#E11D48', eyeColor: '#E11D48', smile: 'M14 24 Q18 27 22 24', blush: true },
  happy:       { strokeColor: '#40916C', eyeColor: '#40916C', smile: 'M13 23 Q18 29 23 23', blush: true },
  thinking:    { strokeColor: '#1E3A8A', eyeColor: '#1E3A8A', smile: 'M14 25 Q18 25 22 25', blush: false },
  worried:     { strokeColor: '#92400E', eyeColor: '#92400E', smile: 'M14 26 Q18 23 22 26', blush: false },
  celebrating: { strokeColor: '#6B21A8', eyeColor: '#6B21A8', smile: 'M12 22 Q18 30 24 22', blush: true },
};

export default function ClippyCharacter({ mood = 'neutral', size = 52, onClick }: Props) {
  const [frame, setFrame] = useState(0);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % 4), 600);
    const b = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    }, 3000);
    return () => { clearInterval(t); clearInterval(b); };
  }, []);

  const m = MOODS[mood];
  const wiggle = mood === 'celebrating' ? Math.sin(frame * 1.5) * 6 : mood === 'happy' ? Math.sin(frame) * 3 : 0;
  const bounce = mood === 'celebrating' ? Math.abs(Math.sin(frame * 1.2)) * 5 : 0;
  const eyeH = blinking ? 0.5 : 2;

  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 44 60"
      fill="none"
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transform: `rotate(${wiggle}deg) translateY(-${bounce}px)`,
        transition: 'transform 0.15s ease',
        flexShrink: 0,
      }}
      onClick={onClick}
    >
      {/* Paperclip body */}
      <path
        d="M22 5 C13 5 6 12 6 20 L6 40 C6 49 12 55 22 55 C32 55 38 49 38 40 L38 16 C38 10 33 5 27 5 C21 5 17 9 17 16 L17 40 C17 44 19 47 22 47 C25 47 27 44 27 40 L27 18"
        stroke={m.strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Eyes */}
      <ellipse cx="17" cy="22" rx="2" ry={eyeH} fill={m.eyeColor} />
      <ellipse cx="25" cy="22" rx="2" ry={eyeH} fill={m.eyeColor} />
      {/* Pupils — happy/celebrating */}
      {['happy', 'celebrating'].includes(mood) && !blinking && (
        <>
          <circle cx="17.5" cy="22" r="0.8" fill="white" />
          <circle cx="25.5" cy="22" r="0.8" fill="white" />
        </>
      )}
      {/* Eyebrows */}
      {mood === 'worried' && (
        <>
          <path d="M14 18 Q17 16 19 18" stroke={m.strokeColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M23 18 Q26 16 28 18" stroke={m.strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {mood === 'thinking' && (
        <path d="M22 18 L26 17" stroke={m.strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      )}
      {/* Smile */}
      <path d={m.smile} stroke={m.strokeColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Blush */}
      {m.blush && (
        <>
          <ellipse cx="14" cy="25" rx="2.5" ry="1.5" fill={m.strokeColor} opacity="0.25" />
          <ellipse cx="28" cy="25" rx="2.5" ry="1.5" fill={m.strokeColor} opacity="0.25" />
        </>
      )}
      {/* Celebrating sparkles */}
      {mood === 'celebrating' && (
        <g opacity={0.6 + Math.sin(frame) * 0.4}>
          <text x="32" y="12" fontSize="8">✨</text>
          <text x="4" y="16" fontSize="6">⭐</text>
          <text x="34" y="28" fontSize="6">💫</text>
        </g>
      )}
      {/* Thinking bubble */}
      {mood === 'thinking' && (
        <>
          <circle cx="32" cy="12" r="1.5" fill={m.eyeColor} opacity="0.4" />
          <circle cx="35" cy="8" r="2" fill={m.eyeColor} opacity="0.3" />
          <circle cx="38" cy="5" r="3" fill={m.eyeColor} opacity="0.2" />
        </>
      )}
    </svg>
  );
}
