import { createServiceClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/push/vapid';
import type { PushPayload, PushSubscriptionRecord } from '@/lib/push/vapid';

export async function POST(req: Request) {
  const { userId, title, body, tag, data } = await req.json() as {
    userId: string;
    title: string;
    body: string;
    tag?: string;
    data?: Record<string, unknown>;
  };

  if (!userId || !title || !body) {
    return Response.json({ error: 'userId, title, body required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) return Response.json({ sent: 0 });

  const payload: PushPayload = {
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag,
    data,
  };

  const { sent, expiredEndpoints } = await sendPushToUser(
    subs as PushSubscriptionRecord[],
    payload
  );

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);
  }

  return Response.json({ sent });
}
