import Anthropic from '@anthropic-ai/sdk';

let _anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// Claude Sonnet 4 pricing at ~£0.80/USD
const COST_PER_1K_INPUT_GBP = 0.0024;  // $3/1M input
const COST_PER_1K_OUTPUT_GBP = 0.012;  // $15/1M output
const MODEL = 'claude-sonnet-4-20250514';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  costGbp: number;
}

export async function generateText(prompt: string, systemPrompt: string, maxTokens = 500): Promise<string> {
  const result = await generateWithCost(prompt, systemPrompt, maxTokens);
  return result.text;
}

export async function generateWithCost(prompt: string, systemPrompt: string, maxTokens = 500): Promise<GenerateResult> {
  const client = getClient();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');

  const tokensIn = msg.usage.input_tokens;
  const tokensOut = msg.usage.output_tokens;
  const costGbp = (tokensIn / 1000) * COST_PER_1K_INPUT_GBP + (tokensOut / 1000) * COST_PER_1K_OUTPUT_GBP;

  return { text: block.text, tokensIn, tokensOut, costGbp };
}

export async function generateConversation(
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens = 800
): Promise<GenerateResult> {
  const client = getClient();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');

  const tokensIn = msg.usage.input_tokens;
  const tokensOut = msg.usage.output_tokens;
  const costGbp = (tokensIn / 1000) * COST_PER_1K_INPUT_GBP + (tokensOut / 1000) * COST_PER_1K_OUTPUT_GBP;

  return { text: block.text, tokensIn, tokensOut, costGbp };
}
