import { generateWithCost, MODEL_FAST } from '@/lib/ai/claude';
import { createServiceClient } from '@/lib/supabase/server';

interface RequestBody {
  taskTitle: string;
  successCriteria: string[];
  narrative: string;
  userId: string;
}

export async function POST(req: Request) {
  const { taskTitle, successCriteria, narrative, userId } = await req.json() as RequestBody;

  if (!taskTitle || !userId) {
    return Response.json({ error: 'taskTitle and userId required' }, { status: 400 });
  }

  const criteriaList = successCriteria.length > 0
    ? successCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : 'No explicit criteria provided.';

  const prompt = `Task: ${taskTitle}

Success criteria:
${criteriaList}

Apprentice's work summary:
${narrative || '(No narrative provided yet)'}

Score this submission against the success criteria. For each criterion:
- Mark it as LIKELY MET, UNCLEAR, or LIKELY NOT MET based on the narrative
- If unclear or not met, explain what's missing

Then give an overall readiness score (1-5) and one specific thing to address before submitting.

Be direct. Nick will also review — your job is to catch issues before they waste his review time.`;

  const supabase = createServiceClient();

  let result;
  try {
    result = await generateWithCost(prompt, 'You are a quality reviewer for an apprentice developer\'s work submission. Be precise, direct, and commercially grounded.', 600, { fast: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return Response.json({ error: msg }, { status: 500 });
  }

  // Log usage
  await supabase.from('api_usage_log').insert({
    user_id: userId,
    feature: 'guide_self_check',
    model: MODEL_FAST,
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    api_cost_gbp: result.costGbp,
  });

  return Response.json({ result: result.text });
}
