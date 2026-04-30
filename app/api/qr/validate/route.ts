import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { token } = await req.json() as { token: string };
  if (!token) return Response.json({ valid: false, error: 'No token' }, { status: 400 });

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('provision_tokens')
    .select('id, business_id, user_id, used, expires_at')
    .eq('token', token)
    .single();

  if (error || !data) return Response.json({ valid: false, error: 'Token not found' });

  if (data.used) return Response.json({ valid: false, error: 'Token already used' });

  if (new Date(data.expires_at) < new Date()) {
    return Response.json({ valid: false, error: 'Token expired' });
  }

  // Mark as used
  await supabase.from('provision_tokens').update({ used: true }).eq('id', data.id);

  return Response.json({
    valid: true,
    userId: data.user_id,
    businessId: data.business_id,
  });
}
