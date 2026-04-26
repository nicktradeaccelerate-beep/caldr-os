import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { userId, businessId } = await req.json();

  const supabase = createServiceClient();
  const token = crypto.randomUUID();

  const { error } = await supabase.from('provision_tokens').insert({
    business_id: businessId,
    user_id: userId,
    token,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const provisionUrl = `${process.env.NEXT_PUBLIC_URL}/onboard?token=${token}`;
  return Response.json({ url: provisionUrl, token });
}
