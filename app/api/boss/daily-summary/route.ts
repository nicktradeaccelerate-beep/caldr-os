import { generateText } from '@/lib/ai/claude';
import { notifyBoss } from '@/lib/boss/notify';
import { createServiceClient } from '@/lib/supabase/server';
import type { Business } from '@/types';

export async function POST(req: Request) {
  const { vaId, vaName, businessId } = await req.json() as {
    vaId: string;
    vaName: string;
    businessId: string;
  };

  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const [businessResult, callsResult, tasksResult, updatesResult] = await Promise.all([
    supabase.from('businesses').select('*').eq('id', businessId).single(),
    supabase
      .from('calls')
      .select('duration_seconds, sentiment_score, outcome, status')
      .eq('va_id', vaId)
      .gte('started_at', `${today}T00:00:00`)
      .eq('status', 'completed'),
    supabase
      .from('tasks')
      .select('text, hearts, status, elapsed_seconds')
      .eq('user_id', vaId)
      .gte('created_at', `${today}T00:00:00`),
    supabase
      .from('boss_updates')
      .select('message, created_at')
      .eq('va_id', vaId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: true }),
  ]);

  if (!businessResult.data) return Response.json({ error: 'Business not found' }, { status: 404 });

  const calls = callsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const updates = updatesResult.data ?? [];

  const totalCalls = calls.length;
  const totalTalkMins = Math.round(calls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60);
  const avgSentiment = calls.length > 0
    ? Math.round(calls.reduce((s, c) => s + (c.sentiment_score ?? 0), 0) / calls.length)
    : 0;
  const tasksCompleted = tasks.filter(t => t.status === 'done').length;
  const totalHearts = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.hearts ?? 0), 0);

  const context = `
VA: ${vaName}
Calls today: ${totalCalls} (${totalTalkMins} mins total, avg sentiment ${avgSentiment}%)
Tasks completed: ${tasksCompleted}/${tasks.length} (${totalHearts} hearts earned)
Updates log: ${updates.map(u => u.message).join(' | ')}
Business: ${(businessResult.data as Business).name}
  `.trim();

  const systemPrompt = `You are writing a daily performance summary for a business owner. Be warm, specific, and data-driven. Max 200 words.`;

  let summaryText: string;
  try {
    summaryText = await generateText(context, systemPrompt, 300);
  } catch {
    summaryText = `${vaName} completed ${tasksCompleted} tasks and made ${totalCalls} calls today (${totalTalkMins} mins, avg sentiment ${avgSentiment}%). ${totalHearts} hearts earned.`;
  }

  // Fire notify (logs + sends WhatsApp/email)
  await notifyBoss('daily_summary', {
    vaId,
    vaName,
    taskText: summaryText,
    duration: `${totalTalkMins}m calls, ${tasksCompleted} tasks`,
    hearts: String(totalHearts),
  }, businessResult.data as Business);

  return Response.json({
    summary: summaryText,
    stats: { totalCalls, totalTalkMins, avgSentiment, tasksCompleted, totalHearts },
  });
}
