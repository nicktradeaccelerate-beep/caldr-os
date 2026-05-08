import { generateWithCost, MODEL } from '@/lib/ai/claude';
import { PROMPTS } from '@/lib/ai/prompts';
import { createServiceClient } from '@/lib/supabase/server';
import type { CompletedCall, Business } from '@/types';

export async function POST(req: Request) {
  const { call, callId, businessId } = await req.json() as {
    call: CompletedCall;
    callId?: string;
    businessId: string;
  };

  const supabase = createServiceClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });

  const systemPrompt = PROMPTS.postCallDebrief(call, business as Business);

  try {
    const result = await generateWithCost('Generate the post-call debrief.', systemPrompt, 300);

    if (callId) {
      await supabase.from('calls').update({
        coaching_note: result.text,
        ai_score: extractScore(result.text),
      }).eq('id', callId);
    }

    supabase.from('api_usage_log').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      feature: 'post_call_debrief',
      model: MODEL,
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      api_cost_gbp: result.costGbp,
    }).then(() => {}, () => {});

    return Response.json({ debrief: result.text });
  } catch {
    return Response.json({ error: 'AI unavailable' }, { status: 500 });
  }
}

function extractScore(text: string): number | null {
  const match = text.match(/(\d{1,3})\s*\/\s*100/);
  return match ? Math.min(100, parseInt(match[1], 10)) : null;
}
