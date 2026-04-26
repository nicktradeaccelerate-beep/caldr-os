import { createServiceClient } from '@/lib/supabase/server';

// GET /api/ai/usage?userId=xxx — fetch current usage
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

  const supabase = createServiceClient();
  const { data } = await supabase.from('users').select('ai_usage').eq('id', userId).single();

  return Response.json(data?.ai_usage ?? { claude: 0, gpt: 0, gemini: 0 });
}

// POST /api/ai/usage/reset — midnight cron resets usage
// Called by Supabase pg_cron or Vercel cron
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createServiceClient();
  await supabase.from('users').update({ ai_usage: { claude: 0, gpt: 0, gemini: 0 } });

  return Response.json({ reset: true, at: new Date().toISOString() });
}
