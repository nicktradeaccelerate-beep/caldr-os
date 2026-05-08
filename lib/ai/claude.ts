import Anthropic from '@anthropic-ai/sdk';

let _anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

const MODEL = 'claude-sonnet-4-6';
const MODEL_FAST = 'claude-haiku-4-5-20251001';

// Sonnet 4.6: $3/$15 per 1M tokens → ~£0.80/USD
const SONNET_INPUT_GBP  = 0.0024;   // per 1K tokens
const SONNET_OUTPUT_GBP = 0.012;

// Haiku 4.5: $0.80/$4 per 1M tokens — ~75% cheaper for simple tasks
const HAIKU_INPUT_GBP  = 0.00064;
const HAIKU_OUTPUT_GBP = 0.0032;

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

export interface GenerateOptions {
  fast?: boolean;   // use Haiku instead of Sonnet
  cache?: boolean;  // cache system prompt (ephemeral, 5-min TTL — saves ~80% on repeated turns)
}

function calcCost(tokensIn: number, tokensOut: number, fast: boolean): number {
  const inputRate  = fast ? HAIKU_INPUT_GBP  : SONNET_INPUT_GBP;
  const outputRate = fast ? HAIKU_OUTPUT_GBP : SONNET_OUTPUT_GBP;
  return (tokensIn / 1000) * inputRate + (tokensOut / 1000) * outputRate;
}

function systemParam(text: string, cache: boolean): string | Anthropic.TextBlockParam[] {
  if (!cache) return text;
  return [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
}

export async function generateWithCost(
  prompt: string,
  systemPrompt: string,
  maxTokens = 500,
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const { fast = false, cache = false } = opts;
  const client = getClient();

  const msg = await client.messages.create({
    model: fast ? MODEL_FAST : MODEL,
    max_tokens: maxTokens,
    system: systemParam(systemPrompt, cache),
    messages: [{ role: 'user', content: prompt }],
  });

  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');

  const tokensIn  = msg.usage.input_tokens;
  const tokensOut = msg.usage.output_tokens;

  return { text: block.text, tokensIn, tokensOut, costGbp: calcCost(tokensIn, tokensOut, fast) };
}

export async function generateText(
  prompt: string,
  systemPrompt: string,
  maxTokens = 500,
  opts: GenerateOptions = {},
): Promise<string> {
  return (await generateWithCost(prompt, systemPrompt, maxTokens, opts)).text;
}

export async function generateConversation(
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens = 800,
  opts: GenerateOptions = {},
): Promise<GenerateResult> {
  const { fast = false, cache = false } = opts;
  const client = getClient();

  const msg = await client.messages.create({
    model: fast ? MODEL_FAST : MODEL,
    max_tokens: maxTokens,
    system: systemParam(systemPrompt, cache),
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');

  const tokensIn  = msg.usage.input_tokens;
  const tokensOut = msg.usage.output_tokens;

  return { text: block.text, tokensIn, tokensOut, costGbp: calcCost(tokensIn, tokensOut, fast) };
}
