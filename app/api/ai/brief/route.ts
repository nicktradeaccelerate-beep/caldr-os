import { generateWithCost, MODEL_FAST } from '@/lib/ai/claude';
import { PROMPTS } from '@/lib/ai/prompts';
import { createServiceClient } from '@/lib/supabase/server';
import type { User, Business, DayStats } from '@/types';

export async function POST(req: Request) {
  const { userId, regenerate = false } = await req.json();
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

  const [sentimentResult, taskResult] = await Promise.all([
    supabase
      .from('calls')
      .select('sentiment_score, flags')
      .eq('va_id', userId)
      .gte('started_at', yesterday)
      .lt('started_at', today)
      .not('sentiment_score', 'is', null),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('due_date', today)
      .neq('status', 'done'),
  ]);

  const sentimentData = sentimentResult.data ?? [];
  const avgSentiment = sentimentData.length
    ? Math.round(sentimentData.reduce((s: number, c: { sentiment_score: number | null }) => s + (c.sentiment_score ?? 0), 0) / sentimentData.length)
    : 0;

  // Derive weak area from actual call data rather than a hardcoded value
  function deriveWeakArea(): string {
    if ((callCount ?? 0) === 0) return 'prospecting';
    const flagCounts: Record<string, number> = {};
    for (const call of sentimentData as { flags?: string[] }[]) {
      for (const f of call.flags ?? []) {
        flagCounts[f] = (flagCounts[f] ?? 0) + 1;
      }
    }
    const topFlag = Object.entries(flagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (topFlag) return topFlag;
    if (avgSentiment < 50) return 'rapport building';
    if (avgSentiment < 65) return 'handling objections';
    return 'closing';
  }

  const stats: DayStats = {
    callsYesterday: callCount ?? 0,
    avgSentiment,
    tasksToday: taskResult.count ?? 0,
    weakArea: deriveWeakArea(),
  };

  try {
    const result = await generateWithCost('Generate the daily brief.', PROMPTS.dailyBrief(user as User, stats, business), 400, { fast: true });

    supabase.from('api_usage_log').insert({
      user_id: userId,
      feature: 'daily_brief',
      model: MODEL_FAST,
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      api_cost_gbp: result.costGbp,
    }).then(() => {}, () => {});

    if (regenerate) {
      const userRole = (user as unknown as { role: string }).role;
      if (['operator', 'owner'].includes(userRole)) {
        const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
        fetch(`${baseUrl}/api/platform/regenerate-teaching-variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggeredBy: userId }),
        }).catch(() => {});
      }
    }

    return Response.json({ brief: result.text });
  } catch {
    return Response.json({ error: 'Brief generation failed' }, { status: 500 });
  }
}
