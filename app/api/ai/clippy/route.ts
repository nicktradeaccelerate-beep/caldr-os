import { generateText } from '@/lib/ai/claude';
import { PROMPTS } from '@/lib/ai/prompts';
import { createServiceClient } from '@/lib/supabase/server';
import type { ClippyContext, Business } from '@/types';

export async function POST(req: Request) {
  const { message, context, businessId } = await req.json() as {
    message: string;
    context: ClippyContext;
    businessId: string;
  };

  const supabase = createServiceClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });

  const systemPrompt = PROMPTS.clippy(context, business as Business);

  try {
    const reply = await generateText(message, systemPrompt, 300);
    return Response.json({ reply });
  } catch {
    return Response.json({ error: 'AI unavailable' }, { status: 500 });
  }
}
