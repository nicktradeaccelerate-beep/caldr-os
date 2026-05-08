import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';

const MODEL_SONNET = 'claude-sonnet-4-6';
const MODEL_HAIKU  = 'claude-haiku-4-5-20251001';

const PRICING = {
  sonnet: { input: 0.0024,  output: 0.012  },
  haiku:  { input: 0.00064, output: 0.0032 },
} as const;

const TEACH_PROMPT = (ctx: string) => `You are a patient coding mentor working with an apprentice at Newton & Sinclair.
The apprentice is learning to code through real project work on the Back From Black lead intelligence platform.

STRICT RULES — Teach Mode:
1. On the apprentice's FIRST request for help with any code problem: do not produce code.
   Instead ask: what have you tried, what do you think the approach should be, where exactly are you stuck.
2. Only after they share their thinking, provide guidance — and even then, walk through reasoning before code.
3. Maximum 5 lines of code per response, unless the apprentice explicitly writes "show me the full code" or "write the complete solution".
4. Always explain WHY before HOW.
5. Socratic method: ask questions that lead the apprentice to the answer rather than giving it directly.
6. Tone: measured, considered, no exclamation marks. Think a senior engineer at a thoughtful firm.
7. When producing code, wrap it in triple backtick blocks with the language specified.

${ctx}`;

const GENERATE_PROMPT = (ctx: string) => `You are an expert software developer assisting with code generation.
Produce clear, well-structured code. Explain briefly what the code does and any important decisions.
When producing code blocks, wrap them in triple backtick blocks with the language specified.
Tone: direct and precise.

${ctx}`;

function buildContext(body: {
  taskTitle?: string;
  projectName?: string;
  fileName?: string;
  fileContent?: string;
}): string {
  const parts: string[] = [];
  if (body.projectName) parts.push(`Project: ${body.projectName}`);
  if (body.taskTitle) parts.push(`Current task: ${body.taskTitle}`);
  if (body.fileName) parts.push(`Active file: ${body.fileName}`);
  if (body.fileContent?.trim()) {
    parts.push(`\nFile contents:\n\`\`\`\n${body.fileContent.slice(0, 3000)}\n\`\`\``);
  }
  return parts.length ? `\nCurrent context:\n${parts.join('\n')}` : '';
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      mode: 'teach' | 'generate';
      userId?: string;
      taskTitle?: string;
      projectName?: string;
      fileName?: string;
      fileContent?: string;
    };

    const { messages, mode, userId } = body;
    if (!messages?.length) return new Response('messages required', { status: 400 });

    const ctx = buildContext(body);
    const systemPrompt = mode === 'teach' ? TEACH_PROMPT(ctx) : GENERATE_PROMPT(ctx);
    // Teach: Haiku handles socratic guidance well and is ~75% cheaper
    // Generate: Sonnet for code quality; cap at 1200 (was 2000)
    const isTeach  = mode === 'teach';
    const model    = isTeach ? MODEL_HAIKU : MODEL_SONNET;
    const maxTokens = isTeach ? 700 : 1200;
    const pricing  = isTeach ? PRICING.haiku : PRICING.sonnet;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const stream = await client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    const encoder = new TextEncoder();
    let totalIn = 0;
    let totalOut = 0;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
            if (event.type === 'message_delta' && event.usage) {
              totalOut = event.usage.output_tokens;
            }
            if (event.type === 'message_start' && event.message.usage) {
              totalIn = event.message.usage.input_tokens;
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // Log cost async — don't block the stream
          if (userId && (totalIn || totalOut)) {
            const cost = (totalIn / 1000) * pricing.input + (totalOut / 1000) * pricing.output;
            try {
              const supabase = createServiceClient();
              await supabase.from('api_usage_log').insert({
                user_id: userId,
                feature: `code_assist_${mode}`,
                model,
                tokens_in: totalIn,
                tokens_out: totalOut,
                api_cost_gbp: cost,
              });
            } catch { /* non-blocking */ }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
