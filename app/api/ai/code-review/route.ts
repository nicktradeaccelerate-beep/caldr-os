import { generateText } from '@/lib/ai/claude';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { code, filename, userId, businessId } = await req.json() as {
    code: string;
    filename: string;
    userId: string;
    businessId: string;
  };

  if (!code?.trim()) return Response.json({ error: 'code required' }, { status: 400 });

  const supabase = createServiceClient();

  // Check Claude usage
  const { data: userData } = await supabase.from('users').select('ai_usage').eq('id', userId).single();
  const usage = (userData?.ai_usage ?? { claude: 0, gpt: 0, gemini: 0 }) as Record<string, number>;

  if ((usage.claude ?? 0) >= 10) {
    return Response.json({ error: 'Claude daily limit reached.' }, { status: 429 });
  }

  const systemPrompt = `You are a senior software engineer reviewing code.
Provide a clear, actionable code review in this format:
1. **Summary** — what this code does (1-2 sentences)
2. **Issues** — list any bugs, security concerns, or bad practices
3. **Suggestions** — specific improvements with examples
4. **Score** — /10 with one-line rationale

Be direct and specific. If the code is good, say so briefly then add one enhancement.`;

  try {
    const review = await generateText(
      `Please review this ${filename} file:\n\n\`\`\`\n${code.slice(0, 4000)}\n\`\`\``,
      systemPrompt,
      800
    );

    // Increment usage
    await supabase.from('users').update({
      ai_usage: { ...usage, claude: (usage.claude ?? 0) + 1 },
    }).eq('id', userId);

    return Response.json({ review, usage: { ...usage, claude: (usage.claude ?? 0) + 1 } });
  } catch {
    return Response.json({ error: 'AI unavailable' }, { status: 500 });
  }
}
