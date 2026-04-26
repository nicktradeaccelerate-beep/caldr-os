import { createServiceClient } from '@/lib/supabase/server';

// GET /api/boss/updates?businessId=xxx&limit=50
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const since = searchParams.get('since'); // ISO date string — poll from timestamp

  if (!businessId) return Response.json({ error: 'businessId required' }, { status: 400 });

  const supabase = createServiceClient();

  let query = supabase
    .from('boss_updates')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gt('created_at', since);
  }

  const { data, error } = await query;

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ updates: data ?? [] });
}

// DELETE /api/boss/updates — clear all updates for business
export async function DELETE(req: Request) {
  const { businessId } = await req.json() as { businessId: string };
  if (!businessId) return Response.json({ error: 'businessId required' }, { status: 400 });

  const supabase = createServiceClient();
  await supabase.from('boss_updates').delete().eq('business_id', businessId);

  return Response.json({ success: true });
}
