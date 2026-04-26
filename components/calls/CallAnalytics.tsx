'use client';

const HOURS     = ['8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm'];
const CONV_RATES = [12, 28, 67, 72, 45, 38, 61, 58, 34, 18];
const DAYS       = ['Mon','Tue','Wed','Thu','Fri'];
const DAY_RATES  = [52, 71, 48, 65, 43];

const BEST_HOUR = CONV_RATES.indexOf(Math.max(...CONV_RATES));
const BEST_DAY  = DAY_RATES.indexOf(Math.max(...DAY_RATES));

export default function CallAnalytics() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Call Pattern Analytics</div>
      <div style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 16 }}>Your best times to call, by conversion rate</div>

      {/* Power hour callout */}
      <div style={{ padding: '12px 16px', background: 'var(--accent-pale)', borderRadius: 12, border: '1px solid var(--accent-light)', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Your power hour</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{HOURS[BEST_HOUR]} on {DAYS[BEST_DAY]}s</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{CONV_RATES[BEST_HOUR]}% conversion rate — nearly 3× your average</div>
      </div>

      {/* Hourly bar chart */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Conversion by hour</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
          {CONV_RATES.map((rate, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', height: `${(rate / 100) * 70}px`,
                background: i === BEST_HOUR ? 'var(--accent)' : 'rgba(27,67,50,0.25)',
                borderRadius: '4px 4px 0 0', minHeight: 4,
              }} />
              <div style={{
                fontSize: 8,
                color: i === BEST_HOUR ? 'var(--accent)' : 'var(--ink-3)',
                fontWeight: i === BEST_HOUR ? 700 : 400,
                transform: 'rotate(-45deg)', transformOrigin: 'center',
                whiteSpace: 'nowrap',
              }}>
                {HOURS[i]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Day bar chart */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Conversion by day</div>
        {DAYS.map((day, i) => (
          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', width: 28 }}>{day}</div>
            <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${DAY_RATES[i]}%`, height: '100%', background: i === BEST_DAY ? 'var(--accent)' : 'var(--accent-mid)', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: i === BEST_DAY ? 'var(--accent)' : 'var(--ink-2)', minWidth: 32 }}>{DAY_RATES[i]}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
