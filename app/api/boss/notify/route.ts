import { notifyBoss } from '@/lib/boss/notify';
import { createServiceClient } from '@/lib/supabase/server';
import type { BossUpdateType, BossUpdatePayload } from '@/types';

export async function POST(req: Request) {
  const { type, payload, businessId } = await req.json() as {
    type: BossUpdateType;
    payload: BossUpdatePayload;
    businessId: string;
  };

  const supabase = createServiceClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });

  // Fire and forget — never block client
  notifyBoss(type, payload, business as never).catch(() => {});

  return Response.json({ queued: true });
}
