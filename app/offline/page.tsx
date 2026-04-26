'use client';

export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#FAFAF8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      textAlign: 'center',
    }}>
      {/* Icon */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 18,
        background: '#1B4332',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"
            stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 style={{
        fontSize: 22,
        fontWeight: 700,
        color: '#1A1918',
        marginBottom: 8,
        letterSpacing: '-0.3px',
      }}>
        You&apos;re offline
      </h1>

      <p style={{
        fontSize: 14,
        color: '#6B6860',
        maxWidth: 300,
        lineHeight: 1.6,
        marginBottom: 32,
      }}>
        Caldr OS needs a connection for live features. Your tasks and timer data are saved locally and will sync when you&apos;re back online.
      </p>

      <div style={{
        background: '#F5F4F0',
        border: '1px solid #E8E6DF',
        borderRadius: 12,
        padding: '16px 20px',
        maxWidth: 320,
        width: '100%',
        marginBottom: 32,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1918', marginBottom: 10 }}>
          Available offline
        </div>
        {[
          'View saved tasks',
          'Read previous call notes',
          'Access your call scripts',
          'Review AI coaching cards',
        ].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#40916C', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#6B6860' }}>{item}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '10px 24px',
          background: '#1B4332',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '-0.1px',
        }}
      >
        Try again
      </button>
    </div>
  );
}
