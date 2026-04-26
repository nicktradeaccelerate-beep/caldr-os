import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { userId, endpoint, p256dh, auth, userAgent } = await req.json() as {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  };

  if (!userId || !endpoint || !p256dh || !auth) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Upsert — same endpoint may re-subscribe after a browser restart
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint, p256dh, auth, user_agent: userAgent ?? null }, { onConflict: 'endpoint' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json() as { endpoint: string };
  if (!endpoint) return Response.json({ error: 'endpoint required' }, { status: 400 });

  const supabase = createServiceClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return Response.json({ success: true });
}
