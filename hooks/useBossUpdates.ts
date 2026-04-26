import { useCallback } from 'react';
import type { BossUpdateType, BossUpdatePayload } from '@/types';

export function useBossUpdates(businessId: string) {
  const notify = useCallback(async (type: BossUpdateType, payload: Omit<BossUpdatePayload, 'vaId'> & { vaId: string }) => {
    // Fire and forget — never await
    fetch('/api/boss/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload, businessId }),
    }).catch(() => {}); // never block UI
  }, [businessId]);

  return { notify };
}
