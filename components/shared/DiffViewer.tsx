'use client';

interface DiffRow {
  label: string;
  before: string | null;
  after: string | null;
}

interface Props {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  labelMap?: Record<string, string>;
  title?: string;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

function Changed({ a, b }: { a: string | null; b: string | null }) {
  return a !== b;
}

export default function DiffViewer({ before, after, labelMap = {}, title }: Props) {
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  const rows: DiffRow[] = allKeys.map(k => ({
    label: labelMap[k] ?? k.replace(/_/g, ' '),
    before: formatValue(before[k]),
    after: formatValue(after[k]),
  }));

  const changedRows = rows.filter(r => r.before !== r.after);
  const unchangedRows = rows.filter(r => r.before === r.after);

  if (rows.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '10px 0' }}>No changes recorded.</div>
    );
  }

  return (
    <div>
      {title && (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>
          {title}
        </div>
      )}

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 0, marginBottom: 4 }}>
        <div />
        <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px' }}>Before</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px' }}>After</div>
      </div>

      {/* Changed rows first */}
      {changedRows.map((row, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 0,
          borderRadius: 6, marginBottom: 3, overflow: 'hidden',
          border: '1px solid #FDE68A',
        }}>
          <div style={{
            padding: '7px 10px', background: '#FFFBEB',
            fontSize: 11, fontWeight: 600, color: '#92400E',
            borderRight: '1px solid #FDE68A', display: 'flex', alignItems: 'flex-start',
          }}>
            {row.label}
          </div>
          <div style={{
            padding: '7px 10px', background: '#FEF2F2',
            fontSize: 11, color: '#991B1B', fontFamily: 'DM Mono, monospace',
            borderRight: '1px solid #FDE68A', wordBreak: 'break-word',
          }}>
            {row.before}
          </div>
          <div style={{
            padding: '7px 10px', background: '#F0FDF4',
            fontSize: 11, color: '#166534', fontFamily: 'DM Mono, monospace',
            wordBreak: 'break-word',
          }}>
            {row.after}
          </div>
        </div>
      ))}

      {/* Unchanged rows */}
      {unchangedRows.length > 0 && changedRows.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary style={{ fontSize: 11, color: 'var(--ink-3)', cursor: 'pointer', userSelect: 'none', marginBottom: 6 }}>
            {unchangedRows.length} unchanged field{unchangedRows.length !== 1 ? 's' : ''}
          </summary>
          {unchangedRows.map((row, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 0,
              borderRadius: 6, marginBottom: 3, overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <div style={{ padding: '6px 10px', background: 'var(--card)', fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', borderRight: '1px solid var(--border)' }}>
                {row.label}
              </div>
              <div style={{ padding: '6px 10px', background: 'var(--white)', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'DM Mono, monospace', borderRight: '1px solid var(--border)', wordBreak: 'break-word' }}>
                {row.before}
              </div>
              <div style={{ padding: '6px 10px', background: 'var(--white)', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'DM Mono, monospace', wordBreak: 'break-word' }}>
                {row.after}
              </div>
            </div>
          ))}
        </details>
      )}

      {changedRows.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>No fields changed.</div>
      )}
    </div>
  );
}
