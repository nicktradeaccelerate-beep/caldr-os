import { generateText } from '@/lib/ai/claude';
import { createServiceClient } from '@/lib/supabase/server';
import type { Business } from '@/types';

type ModelId = 'claude' | 'gpt' | 'gemini';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DAILY_LIMITS: Record<ModelId, number> = {
  claude: 10,
  gpt:    20,
  gemini: 15,
};

// GPT and Gemini routes via OpenAI-compatible interfaces
// In production replace with real API keys / SDK calls
async function callGPT(message: string, history: Message[], _systemPrompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return `[ChatGPT response to: "${message.slice(0, 60)}…"]\n\nIn production, connect your OpenAI API key via OPENAI_API_KEY env var.`;
  }
  const messages = [
    { role: 'system', content: _systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 500 }),
  });
  const data = await res.json() as { choices?: { message: { content: string } }[] };
  return data.choices?.[0]?.message?.content ?? 'No response';
}

async function callGemini(message: string, history: Message[], _systemPrompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return `[Gemini response to: "${message.slice(0, 60)}…"]\n\nIn production, connect your Gemini API key via GEMINI_API_KEY env var.`;
  }
  const contents = [
    ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: _systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 500 },
    }),
  });
  const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response';
}

export async function POST(req: Request) {
  const { model, message, history, userId, businessId } = await req.json() as {
    model: ModelId;
    message: string;
    history: Message[];
    userId: string;
    businessId: string;
  };

  if (!message?.trim()) return Response.json({ error: 'message required' }, { status: 400 });

  const supabase = createServiceClient();

  // Load current usage + business context in parallel
  const [userResult, businessResult] = await Promise.all([
    supabase.from('users').select('ai_usage').eq('id', userId).single(),
    supabase.from('businesses').select('knowledge, name').eq('id', businessId).single(),
  ]);

  const currentUsage = (userResult.data?.ai_usage ?? { claude: 0, gpt: 0, gemini: 0 }) as Record<ModelId, number>;
  const business = businessResult.data as Business | null;

  // Enforce per-model daily limits
  if ((currentUsage[model] ?? 0) >= DAILY_LIMITS[model]) {
    return Response.json({
      error: `Daily limit reached for ${model}. Switch model to continue.`,
      limitReached: true,
      usage: currentUsage,
    }, { status: 429 });
  }

  const systemPrompt = `You are an AI work assistant for a VA at ${business?.name ?? 'a business'}.
Context: ${business?.knowledge ?? 'A professional services business.'}
Be helpful, concise, and practical. VAs are busy — keep responses focused and actionable.`;

  let reply: string;
  try {
    if (model === 'claude') {
      reply = await generateText(message, systemPrompt, 500, { fast: true });
    } else if (model === 'gpt') {
      reply = await callGPT(message, history, systemPrompt);
    } else {
      reply = await callGemini(message, history, systemPrompt);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error';
    return Response.json({ error: msg }, { status: 500 });
  }

  // Increment usage counter
  const newUsage: Record<ModelId, number> = {
    ...currentUsage,
    [model]: (currentUsage[model] ?? 0) + 1,
  };
  await supabase.from('users').update({ ai_usage: newUsage }).eq('id', userId);

  return Response.json({ reply, usage: newUsage });
}
