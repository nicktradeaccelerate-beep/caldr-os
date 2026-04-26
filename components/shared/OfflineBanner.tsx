'use client';

import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      padding: '8px 16px',
      background: '#FEF3C7',
      borderBottom: '1px solid #FCD34D',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#92400E', flexShrink: 0 }} />
      <div style={{ fontSize: 12, color: '#92400E', fontWeight: 600 }}>
        Offline — tasks + timer saving locally
      </div>
      <div style={{ fontSize: 11, color: '#92400E', marginLeft: 'auto' }}>
        Will sync when reconnected
      </div>
    </div>
  );
}
