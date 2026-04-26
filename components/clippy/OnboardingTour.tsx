'use client';

import { useState, useEffect } from 'react';
import ClippyCharacter, { type ClippyMood } from './ClippyCharacter';

interface Props {
  onComplete: () => void;
}

interface Step {
  title: string;
  body: string;
  mood: ClippyMood;
  action: string;
}

const STEPS: Step[] = [
  { title: "Hi! I'm Pip 📎", body: "I'm your AI work buddy. I'll help you stay organised, use AI tools smartly, and make sure your boss knows how brilliant you are.", mood: 'happy', action: "Let's go →" },
  { title: 'Your tasks live here', body: 'Tap Start on any task to begin tracking time. I\'ll cheer you on as you go — and earn hearts ♥ for every completion.', mood: 'celebrating', action: 'Love it →' },
  { title: 'Hearts & levels 💛', body: 'Every task earns hearts. Collect enough to level up. Your hearts glow — don\'t let them fade!', mood: 'happy', action: 'Got it →' },
  { title: 'Your boss gets updates', body: 'Every task you start and complete is logged automatically. No need to report in.', mood: 'neutral', action: 'Perfect →' },
  { title: 'Ask me anything', body: 'Tap the 📎 button any time to ask about pricing, objections, or anything about the business.', mood: 'thinking', action: 'I will! →' },
  { title: "You're all set! 🎉", body: "Everything is ready. Start your first task and let's have a great shift together. I'm always here.", mood: 'celebrating', action: 'Start my shift →' },
];

export default function OnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--white)', borderRadius: 24, padding: 24,
        width: '100%', maxWidth: 420,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        animation: 'fadeUp 0.25s ease',
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6,
              borderRadius: 3,
              background: i === step ? 'var(--rose)' : 'var(--border)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
          <ClippyCharacter mood={current.mood} size={56} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 8, letterSpacing: '-0.02em' }}>
              {current.title}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7 }}>
              {current.body}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ flex: 1, padding: 12, background: 'var(--card)', color: 'var(--ink-2)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : onComplete()}
            style={{ flex: 2, padding: 12, background: 'var(--rose)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            {current.action}
          </button>
        </div>

        {step < STEPS.length - 1 && (
          <button
            onClick={onComplete}
            style={{ display: 'block', width: '100%', textAlign: 'center', padding: '10px', background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', marginTop: 4 }}
          >
            Skip tour
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
