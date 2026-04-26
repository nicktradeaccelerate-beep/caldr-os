'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AIHub from '@/components/ai/AIHub';
import type { ModelId } from '@/components/ai/ModelSwitcher';

export default function AIPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [initialUsage, setInitialUsage] = useState<Record<ModelId, number>>({ claude: 0, gpt: 0, gemini: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const { data: userData } = await supabase
        .from('users')
        .select('id, business_id, ai_usage')
        .eq('id', data.user.id)
        .single();
      if (userData) {
        setUserId(userData.id);
        setBusinessId(userData.business_id);
        setInitialUsage((userData.ai_usage as Record<ModelId, number>) ?? { claude: 0, gpt: 0, gemini: 0 });
      }
      setLoading(false);
    });
  }, []);

  // Demo fallback — works without auth in dev
  const demoUserId = userId ?? 'demo-user';
  const demoBusinessId = businessId ?? 'demo-business';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100dvh - 100px)' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.4px', marginBottom: 4 }}>AI Hub</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Claude · ChatGPT · Gemini — switch models, track daily limits, persistent conversations
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading…</div>
      ) : (
        <AIHub
          userId={demoUserId}
          businessId={demoBusinessId}
          initialUsage={initialUsage}
        />
      )}
    </div>
  );
}
