'use client';

export type ModelId = 'claude' | 'gpt' | 'gemini';

export interface ModelConfig {
  id: ModelId;
  name: string;
  subLabel: string;
  description: string;
  dailyLimit: number;
  color: string;
  bg: string;
  border: string;
}

export const MODELS: ModelConfig[] = [
  {
    id: 'claude',
    name: 'Claude',
    subLabel: 'Sonnet 4.6',
    description: 'Best for coaching, copywriting, nuanced reasoning',
    dailyLimit: 10,
    color: '#C96442',
    bg: 'rgba(201,100,66,0.08)',
    border: 'rgba(201,100,66,0.2)',
  },
  {
    id: 'gpt',
    name: 'ChatGPT',
    subLabel: 'GPT-4o mini',
    description: 'Fast, great for summaries and structured output',
    dailyLimit: 20,
    color: '#19A37F',
    bg: 'rgba(25,163,127,0.08)',
    border: 'rgba(25,163,127,0.2)',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    subLabel: 'Gemini 1.5 Flash',
    description: 'Strong at analysis, long-context tasks',
    dailyLimit: 15,
    color: '#1A73E8',
    bg: 'rgba(26,115,232,0.08)',
    border: 'rgba(26,115,232,0.2)',
  },
];

// Model logo SVGs — inline for zero-dependency
function ClaudeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#C96442" opacity="0.15"/>
      <path d="M8 16l2.5-8h3L16 16" stroke="#C96442" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="9.5" y1="13" x2="14.5" y2="13" stroke="#C96442" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function GPTIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#19A37F" opacity="0.15"/>
      <path d="M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z" stroke="#19A37F" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="1.5" fill="#19A37F"/>
    </svg>
  );
}

function GeminiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#1A73E8" opacity="0.15"/>
      <path d="M12 4C12 4 15 8 15 12C15 16 12 20 12 20C12 20 9 16 9 12C9 8 12 4 12 4Z" stroke="#1A73E8" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M4 12C4 12 8 9 12 9C16 9 20 12 20 12C20 12 16 15 12 15C8 15 4 12 4 12Z" stroke="#1A73E8" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

export const MODEL_ICONS: Record<ModelId, React.ReactNode> = {
  claude: <ClaudeIcon />,
  gpt:    <GPTIcon />,
  gemini: <GeminiIcon />,
};

interface ModelSwitcherProps {
  selected: ModelId;
  usage: Record<ModelId, number>;
  onChange: (id: ModelId) => void;
}

export default function ModelSwitcher({ selected, usage, onChange }: ModelSwitcherProps) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {MODELS.map(m => {
        const isSelected = selected === m.id;
        const used = usage[m.id] ?? 0;
        const pct = Math.min(100, (used / m.dailyLimit) * 100);
        const exhausted = used >= m.dailyLimit;

        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            disabled={exhausted}
            style={{
              flex: 1, padding: '10px 8px',
              background: isSelected ? m.bg : 'var(--white)',
              border: `1.5px solid ${isSelected ? m.border : 'var(--border)'}`,
              borderRadius: 12, cursor: exhausted ? 'not-allowed' : 'pointer',
              textAlign: 'left', opacity: exhausted ? 0.55 : 1,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {MODEL_ICONS[m.id]}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? m.color : 'var(--ink)', lineHeight: 1.2 }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 9, color: 'var(--ink-3)', fontWeight: 500 }}>{m.subLabel}</div>
              </div>
            </div>

            {/* Mini usage bar */}
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: pct >= 100 ? 'var(--rose)' : pct >= 80 ? '#F59E0B' : m.color,
                borderRadius: 2, transition: 'width 0.3s',
              }}/>
            </div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 3 }}>
              {exhausted ? 'Limit reached' : `${used}/${m.dailyLimit} today`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
