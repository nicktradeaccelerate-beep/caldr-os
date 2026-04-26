'use client';

interface Props {
  count: 1 | 2 | 3;
  size?: number;
}

export default function Hearts({ count, size = 14 }: Props) {
  return (
    <span style={{ fontSize: size, letterSpacing: 2, lineHeight: 1 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} style={{ color: i < count ? 'var(--rose)' : 'var(--border)', opacity: i < count ? 1 : 0.5 }}>♥</span>
      ))}
    </span>
  );
}
