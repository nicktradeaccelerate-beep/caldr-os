import { generateText } from '@/lib/ai/claude';
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
    const debrief = await generateText('Generate the post-call debrief.', systemPrompt, 300);

    // Save coaching note back to the call record
    if (callId) {
      await supabase.from('calls').update({
        coaching_note: debrief,
        ai_score: extractScore(debrief),
      }).eq('id', callId);
    }

    return Response.json({ debrief });
  } catch {
    return Response.json({ error: 'AI unavailable' }, { status: 500 });
  }
}

function extractScore(text: string): number | null {
  const match = text.match(/(\d{1,3})\s*\/\s*100/);
  return match ? Math.min(100, parseInt(match[1], 10)) : null;
}
