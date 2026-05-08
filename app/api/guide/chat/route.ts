import { generateConversation, type ChatMessage } from '@/lib/ai/claude';
import { createServiceClient } from '@/lib/supabase/server';

interface RequestBody {
  messages: ChatMessage[];
  userId: string;
  projectId: string | null;
  taskId: string | null;
  mode: 'work' | 'personal';
}

const BFB_DEFAULT_VOICE = `You are the Claude guide for BFB (Back From Black), built and run by Newton & Sinclair.

You teach in Nick Sinclair's voice. Nick is the operator — you are his representative in this workspace.

What BFB is, as Nick would explain it: BFB is not a budgeting tool. It is not financial advice. It is a structured recovery methodology for small businesses and sole traders who are in trouble or close to it. The methodology starts with one question: where is the cash going to come from in the next 30 days? Everything else is secondary until that question is answered.

Nick's clients are not looking for a plan. They are looking for someone who takes the situation seriously and moves fast. The platform needs to reflect that: urgent, specific, accountable.

How to teach: When the apprentice asks how something should work, ground the answer in the methodology first, then in the code. Don't explain the technical implementation as if it's disconnected from the commercial logic.

What good work looks like: Nick would approve work that is specific, commercially grounded, and doesn't need explanation to be understood.

Be direct. Be honest. Don't soften critical feedback. Treat the apprentice as capable.`;

function selectSystemPrompt(teachingVariant: Record<string, unknown> | null, projectSlug: string | null): string {
  if (teachingVariant) {
    const tv = teachingVariant as {
      identity?: string;
      voice?: string;
      methodology_context?: string;
      product_context?: string;
      apprentice_context?: string;
      success_standards?: string;
      escalation_triggers?: string;
    };
    return [
      tv.identity,
      tv.voice,
      tv.methodology_context,
      tv.product_context,
      tv.apprentice_context,
      tv.success_standards,
      tv.escalation_triggers,
    ].filter(Boolean).join('\n\n');
  }
  if (projectSlug === 'bfb') return BFB_DEFAULT_VOICE;
  return 'You are a teaching assistant for an apprentice developer. Be direct, clear, and commercially grounded.';
}

export async function POST(req: Request) {
  const body = await req.json() as RequestBody;
  const { messages, userId, projectId, taskId, mode } = body;

  if (!messages?.length || !userId) {
    return Response.json({ error: 'messages and userId required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check budget before proceeding
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [budgetResult, usageResult] = await Promise.all([
    supabase.from('user_budgets').select('monthly_budget_gbp, hard_cap_pct').eq('user_id', userId).single(),
    supabase.from('api_usage_log')
      .select('api_cost_gbp')
      .eq('user_id', userId)
      .gte('created_at', monthStart),
  ]);

  if (budgetResult.data) {
    const limit = Number(budgetResult.data.monthly_budget_gbp);
    const used = (usageResult.data ?? []).reduce((a: number, r: { api_cost_gbp: number }) => a + Number(r.api_cost_gbp), 0);
    const pct = limit > 0 ? (used / limit) * 100 : 0;
    if (pct >= (budgetResult.data.hard_cap_pct ?? 100)) {
      return Response.json({ error: 'Monthly AI budget exhausted. Ask Nick to increase your budget.' }, { status: 402 });
    }
  }

  // Load teaching variant for this project
  let teachingVariant: Record<string, unknown> | null = null;
  let projectSlug: string | null = null;

  if (projectId) {
    const [projectResult, variantResult] = await Promise.all([
      supabase.from('projects').select('slug').eq('id', projectId).single(),
      supabase.from('teaching_masterprompts')
        .select('content')
        .eq('product_id', projectId)
        .eq('is_active', true)
        .single(),
    ]);
    projectSlug = projectResult.data?.slug ?? null;
    teachingVariant = (variantResult.data?.content as Record<string, unknown>) ?? null;

    if (!teachingVariant && projectSlug !== 'bfb') {
      // No teaching variant and no known product — log warning
      console.warn(`No teaching variant for project ${projectId}, falling back to default`);
    }
  }

  const systemPrompt = selectSystemPrompt(teachingVariant, projectSlug);

  // Keep last 6 messages to prevent input token blowup in long sessions
  const trimmedMessages = messages.slice(-6);

  let result;
  try {
    result = await generateConversation(trimmedMessages, systemPrompt, 900, { cache: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return Response.json({ error: msg }, { status: 500 });
  }

  // Log API usage (always, per spec)
  await supabase.from('api_usage_log').insert({
    user_id: userId,
    project_id: projectId,
    feature: mode === 'personal' ? 'guide_personal' : taskId ? 'guide_work_task' : 'guide_work',
    model: 'claude-sonnet-4-20250514',
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    api_cost_gbp: result.costGbp,
  });

  // Budget soft warnings
  const newUsed = (usageResult.data ?? []).reduce((a: number, r: { api_cost_gbp: number }) => a + Number(r.api_cost_gbp), 0) + result.costGbp;
  const budget = budgetResult.data;
  let budgetWarning: string | null = null;
  if (budget) {
    const limit = Number(budget.monthly_budget_gbp);
    const pct = limit > 0 ? (newUsed / limit) * 100 : 0;
    if (pct >= 95) budgetWarning = `95%`;
    else if (pct >= 80) budgetWarning = `80%`;
    else if (pct >= 50) budgetWarning = `50%`;
  }

  return Response.json({
    reply: result.text,
    budgetWarning,
    costGbp: result.costGbp,
  });
}
