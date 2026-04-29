import { generateText } from '@/lib/ai/claude';
import { PROMPTS } from '@/lib/ai/prompts';
import { createServiceClient } from '@/lib/supabase/server';
import type { User, Business, DayStats } from '@/types';

export async function POST(req: Request) {
  const { userId } = await req.json();
  const supabase = createServiceClient();

  const { data: user } = await supabase.from('users').select('*, businesses(*)').eq('id', userId).single();
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  const business = user.businesses as Business;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const { count: callCount } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true })
    .eq('va_id', userId)
    .gte('started_at', yesterday)
    .lt('started_at', today);

  const { data: sentimentData } = await supabase
    .from('calls')
    .select('sentiment_score')
    .eq('va_id', userId)
    .gte('started_at', yesterday)
    .lt('started_at', today)
    .not('sentiment_score', 'is', null);

  const avgSentiment = sentimentData?.length
    ? Math.round(sentimentData.reduce((s: number, c: { sentiment_score: number | null }) => s + (c.sentiment_score ?? 0), 0) / sentimentData.length)
    : 0;

  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('due_date', today)
    .neq('status', 'done');

  const stats: DayStats = {
    callsYesterday: callCount ?? 0,
    avgSentiment,
    tasksToday: taskCount ?? 0,
    weakArea: 'closing',
  };

  try {
    const brief = await generateText('Generate the daily brief.', PROMPTS.dailyBrief(user as User, stats, business), 400);

    // Fire-and-forget: check if teaching variants need regeneration
    // (operator masterprompt context may have changed)
    // V1.1: change trigger from page load to masterprompt regeneration event for cost efficiency
    const userRole = (user as unknown as { role: string }).role;
    if (['operator', 'owner'].includes(userRole)) {
      const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
      fetch(`${baseUrl}/api/platform/regenerate-teaching-variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: userId }),
      }).catch(() => {
        // Background fire-and-forget — failures are non-blocking
      });
    }

    return Response.json({ brief });
  } catch {
    return Response.json({ error: 'Brief generation failed' }, { status: 500 });
  }
}
