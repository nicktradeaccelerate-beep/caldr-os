'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import CodeEnv from '@/components/code/CodeEnv';

export default function CodePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const { data: userData } = await supabase
        .from('users')
        .select('id, business_id')
        .eq('id', data.user.id)
        .single();
      if (userData) {
        setUserId(userData.id);
        setBusinessId(userData.business_id);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div style={{
      maxWidth: 900, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100dvh - 96px)',
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>Code Environment</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Script editor · AI code review · Terminal · File tabs
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{
          flex: 1, background: 'var(--white)',
          borderRadius: 16, border: '1px solid var(--border)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <CodeEnv
            userId={userId ?? 'demo-user'}
            businessId={businessId ?? 'demo-business'}
          />
        </div>
      )}
    </div>
  );
}
