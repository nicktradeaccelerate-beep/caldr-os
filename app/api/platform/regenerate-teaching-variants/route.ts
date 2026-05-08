import { generateWithCost, MODEL } from '@/lib/ai/claude';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createServiceClient();
  const body = await req.json().catch(() => ({})) as { triggeredBy?: string };

  const { data: variants } = await supabase
    .from('teaching_masterprompts')
    .select('id, product_id, voice_profile, content')
    .eq('is_active', true)
    .eq('status', 'active');

  if (!variants?.length) {
    return Response.json({ regenerated: 0 });
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, slug')
    .in('id', variants.map(v => v.product_id));

  const projectMap: Record<string, { name: string; slug: string }> = {};
  for (const p of projects ?? []) projectMap[p.id] = p;

  let regenerated = 0;
  const names: string[] = [];

  for (const variant of variants) {
    const project = projectMap[variant.product_id];
    if (!project) continue;

    const voiceProfile = (variant.voice_profile as Record<string, string>) ?? {};
    const voiceProfileText = Object.entries(voiceProfile)
      .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`)
      .join('\n');

    const prompt = `You are generating an updated teaching variant of Nick Sinclair's masterprompt for ${project.name}.

Voice profile:
${voiceProfileText || '(default BFB voice)'}

Generate a teaching-variant masterprompt that:
1. Teaches in Nick's voice — direct, unsparing, commercial, precise
2. Explains the methodology as Nick would explain it
3. Grounds every explanation in ${project.name}
4. Treats the apprentice as capable but new to the methodology
5. Maintains Nick's intolerance for vagueness

Return JSON with structure:
{
  "product_id": "${variant.product_id}",
  "teaching_variant": {
    "identity": "...",
    "voice": "...",
    "methodology_context": "...",
    "product_context": "...",
    "apprentice_context": "...",
    "success_standards": "...",
    "escalation_triggers": "..."
  }
}`;

    try {
      const result = await generateWithCost(prompt, 'Return only valid JSON, no markdown.', 1000);

      // Log usage
      await supabase.from('api_usage_log').insert({
        user_id: body.triggeredBy ?? '00000000-0000-0000-0000-000000000000',
        project_id: variant.product_id,
        feature: 'teaching_variant_auto_regen',
        model: MODEL,
        tokens_in: result.tokensIn,
        tokens_out: result.tokensOut,
        api_cost_gbp: result.costGbp,
      });

      let content: Record<string, unknown>;
      try {
        const cleaned = result.text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        content = JSON.parse(cleaned) as Record<string, unknown>;
      } catch {
        content = { raw: result.text };
      }

      // Mark old variant as pending review, insert new one
      await supabase.from('teaching_masterprompts')
        .update({ is_active: false, status: 'inactive' })
        .eq('id', variant.id);

      await supabase.from('teaching_masterprompts').insert({
        product_id: variant.product_id,
        base_masterprompt_version: 'v2',
        content,
        voice_profile: voiceProfile,
        is_active: true,
        status: 'pending_review',
      });

      regenerated++;
      names.push(project.name);
    } catch (err) {
      console.error(`Failed to regenerate variant for ${project.name}:`, err);
    }
  }

  return Response.json({ regenerated, names });
}
