/**
 * Minnie wordmark for caldr-os.
 * Cormorant Garamond italic with oxblood→bronze gradient text-fill.
 * Mirrors the caldr-care Logo so both apps share the brand-house identity.
 */
'use client';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<Size, { font: number; sup: number; gap: number; supTop: number }> = {
  sm: { font: 18, sup: 8,  gap: 2, supTop: -8 },
  md: { font: 22, sup: 9,  gap: 3, supTop: -10 },
  lg: { font: 36, sup: 11, gap: 4, supTop: -16 },
  xl: { font: 56, sup: 14, gap: 6, supTop: -24 },
};

export function Logo({
  size = 'md',
  suffix,
  inline = false,
}: {
  size?: Size;
  suffix?: string;
  inline?: boolean;
}) {
  const s = sizes[size];
  return (
    <span
      style={{
        display: inline ? 'inline-flex' : 'flex',
        alignItems: 'baseline',
        gap: s.gap,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: s.font,
          background: 'linear-gradient(135deg, #5C1A1A 0%, #8B6240 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
        }}
      >
        Minnie
      </span>
      <span
        style={{
          fontSize: s.sup,
          color: '#B8935A',
          position: 'relative',
          top: s.supTop / 2,
          letterSpacing: '0.15em',
        }}
      >
        ©
      </span>
      {suffix && (
        <span
          style={{
            fontFamily: "'Jost', -apple-system, system-ui, sans-serif",
            fontSize: Math.max(9, Math.round(s.font * 0.3)),
            color: 'var(--ink-3)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            marginLeft: s.gap * 2,
          }}
        >
          {suffix}
        </span>
      )}
    </span>
  );
}
