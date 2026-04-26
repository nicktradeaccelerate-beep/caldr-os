import { generateWithCost } from '@/lib/ai/claude';
import { createServiceClient } from '@/lib/supabase/server';
import { createServerClient, type CookieOptions } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface RequestBody {
  projectId: string;
  voiceProfile: Record<string, string>;
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(_name: string, _value: string, _options: CookieOptions) {},
        remove(_name: string, _options: CookieOptions) {},
      },
    }
  );

  const { data: { session } } = await authClient.auth.getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId, voiceProfile } = await req.json() as RequestBody;
  if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: project } = await supabase.from('projects').select('name, slug').eq('id', projectId).single();
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

  const voiceProfileText = Object.entries(voiceProfile)
    .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`)
    .join('\n');

  const prompt = `You are generating a teaching variant of Nick Sinclair's masterprompt for ${project.name}.

Voice profile for this product:
${voiceProfileText || '(Use default BFB voice — direct, commercial, methodological)'}

Generate a teaching-variant masterprompt that:
1. Teaches in Nick's voice — direct, unsparing, commercial, precise
2. Explains the methodology as Nick would explain it, not as a textbook would
3. Grounds every explanation in the specific product (${project.name}) and its real context
4. Treats the apprentice as capable but new to this methodology
5. Never over-explains obvious things; never under-explains methodological choices
6. References Nick's direct experience and commercial instincts where relevant
7. Maintains Nick's intolerance for vagueness, hand-waving, or work that isn't commercially grounded

Return a JSON object with this exact structure:
{
  "product_id": "${projectId}",
  "product_name": "${project.name}",
  "teaching_variant": {
    "identity": "Who the Guide is and who it speaks for",
    "voice": "How the Guide speaks — tone, directness, style",
    "methodology_context": "The core methodology and why it exists (as Nick would explain it)",
    "product_context": "What this specific product is and what problem it solves",
    "apprentice_context": "What the apprentice is building and what success looks like",
    "success_standards": "What Nick approves and what he rejects",
    "escalation_triggers": "When to offer to flag Nick"
  }
}`;

  let result;
  try {
    result = await generateWithCost(prompt, 'You are a masterprompt generator. Return only valid JSON, no markdown.', 1200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return Response.json({ error: msg }, { status: 500 });
  }

  // Log API usage
  await supabase.from('api_usage_log').insert({
    user_id: session.user.id,
    project_id: projectId,
    feature: 'teaching_variant_generate',
    model: 'claude-sonnet-4-20250514',
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    api_cost_gbp: result.costGbp,
  });

  let content: Record<string, unknown>;
  try {
    const cleaned = result.text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    content = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    content = { raw: result.text, parse_error: true };
  }

  // Deactivate previous variants
  await supabase.from('teaching_masterprompts')
    .update({ is_active: false })
    .eq('product_id', projectId);

  // Insert new variant
  const { data: newVariant } = await supabase.from('teaching_masterprompts').insert({
    product_id: projectId,
    base_masterprompt_version: 'v1',
    content,
    voice_profile: voiceProfile,
    generated_by: session.user.id,
    is_active: true,
    status: 'active',
  }).select('id').single();

  return Response.json({ variantId: newVariant?.id, content });
}
