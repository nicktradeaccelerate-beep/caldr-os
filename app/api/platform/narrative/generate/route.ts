import { generateWithCost, MODEL_FAST } from '@/lib/ai/claude';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createServiceClient();

  const now = new Date();
  const periodEnd = new Date(now);
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 1);
  periodStart.setHours(0, 0, 0, 0);
  periodEnd.setHours(0, 0, 0, 0);

  // Gather data from yesterday
  const [actionsRes, submissionsRes, usageRes, usersRes, escalationsRes] = await Promise.all([
    supabase.from('actions')
      .select('user_id, action_type, created_at')
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString()),
    supabase.from('submissions')
      .select('user_id, status, submitted_at, reviewed_at')
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString()),
    supabase.from('api_usage_log')
      .select('user_id, feature, api_cost_gbp')
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString()),
    supabase.from('users').select('id, name, role'),
    supabase.from('escalations')
      .select('user_id, summary, created_at')
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString()),
  ]);

  const userMap: Record<string, string> = {};
  for (const u of usersRes.data ?? []) userMap[u.id] = u.name;

  const totalCost = (usageRes.data ?? []).reduce((a: number, r: { api_cost_gbp: number }) => a + Number(r.api_cost_gbp), 0);
  const actionCount = actionsRes.data?.length ?? 0;
  const submissionCount = submissionsRes.data?.length ?? 0;

  const prompt = `Write a plain-English daily narrative summary for the Newton & Sinclair Operating Ledger platform.

Period: ${periodStart.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}

Platform activity:
- ${actionCount} sandbox actions logged
- ${submissionCount} submission(s) created
- £${totalCost.toFixed(4)} total Anthropic API spend
- ${escalationsRes.data?.length ?? 0} stuck-timer escalation(s)

Apprentice actions: ${(actionsRes.data ?? []).slice(0, 10).map((a: { user_id: string; action_type: string }) => `${userMap[a.user_id] ?? 'apprentice'}: ${a.action_type}`).join(', ') || 'none'}

Escalations: ${(escalationsRes.data ?? []).map((e: { user_id: string; summary: string }) => `${userMap[e.user_id] ?? 'apprentice'}: ${e.summary}`).join('; ') || 'none'}

Write 2-3 short paragraphs. Be direct — Nick reads this in the morning before work. Cover what happened, what cost, any issues. Don't pad. Don't praise.`;

  let result;
  try {
    result = await generateWithCost(
      prompt,
      'You write operational summaries. Plain English, no bullet points, no headers. Direct and factual.',
      400,
      { fast: true },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return Response.json({ error: msg }, { status: 500 });
  }

  // Log usage
  await supabase.from('api_usage_log').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    feature: 'narrative_daily',
    model: MODEL_FAST,
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    api_cost_gbp: result.costGbp,
  });

  const { data: log } = await supabase.from('narrative_logs').insert({
    content: result.text,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  }).select('id, content, generated_at').single();

  return Response.json({ log });
}
