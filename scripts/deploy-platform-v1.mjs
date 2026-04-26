#!/usr/bin/env node
// Run AFTER pasting 011_platform_v1_foundation.sql in the Supabase SQL Editor.
// Usage: node scripts/deploy-platform-v1.mjs

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  readFileSync(join(__dirname, '..', '.env.local'), 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !key.startsWith('#')) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
} catch {}

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_KEY) {
  console.error('Missing required env vars in .env.local');
  process.exit(1);
}

const NICK_EMAIL     = 'nick.tradeaccelerate@gmail.com';
const NICK_NAME      = 'Nick Sinclair';
const BUSINESS_NAME  = 'Newton & Sinclair';

const CHARLENE_EMAIL = 'charlene@devcor.co.za';
const CHARLENE_NAME  = 'Charlene van der Westhuizen';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

function step(n, msg) { console.log(`\n[${n}] ${msg}`); }
function ok(msg)       { console.log(`    ✓ ${msg}`); }
function fail(msg)     { throw new Error(msg); }

async function main() {
  console.log('=== Platform V1 — Automated Setup ===');

  // ── 1. Bootstrap Nick's account if it doesn't exist ─────────
  step(1, 'Bootstrapping owner account…');

  // Create or find Nick's auth user
  let nickId;
  const { data: nickAuth, error: nickAuthErr } = await supabase.auth.admin.createUser({
    email: NICK_EMAIL,
    email_confirm: true,
    user_metadata: { name: NICK_NAME },
  });
  if (nickAuthErr) {
    if (!nickAuthErr.message.toLowerCase().includes('already')) {
      fail(`Nick auth create failed: ${nickAuthErr.message}`);
    }
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users?.find(u => u.email === NICK_EMAIL);
    if (!existing) fail('Could not locate Nick auth user');
    nickId = existing.id;
    ok(`Nick auth already exists: ${nickId}`);
  } else {
    nickId = nickAuth.user.id;
    ok(`Nick auth created: ${nickId}`);
  }

  // Create or find business
  let businessId;
  const { data: existingBiz } = await supabase
    .from('businesses')
    .select('id')
    .eq('name', BUSINESS_NAME)
    .maybeSingle();

  if (existingBiz) {
    businessId = existingBiz.id;
    ok(`Business already exists: ${businessId}`);
  } else {
    const { data: newBiz, error: bizErr } = await supabase
      .from('businesses')
      .insert({ name: BUSINESS_NAME, short_name: 'N&S', plan: 'os' })
      .select('id')
      .single();
    if (bizErr) fail(`Business create failed: ${bizErr.message}`);
    businessId = newBiz.id;
    ok(`Business created: ${businessId}`);
  }

  // Upsert Nick's users row
  const { error: nickUserErr } = await supabase.from('users').upsert({
    id:          nickId,
    business_id: businessId,
    name:        NICK_NAME,
    email:       NICK_EMAIL,
    role:        'owner',
    hearts_total: 10,
    level:       1,
    streak:      0,
    status:      'offline',
    ai_usage:    { claude: 0, gpt: 0, gemini: 0 },
  }, { onConflict: 'id' });
  if (nickUserErr) fail(`Nick user upsert failed: ${nickUserErr.message}`);
  ok(`Nick user row ready`);

  // ── 2. Create Charlene's auth account ───────────────────────
  step(2, 'Creating Charlene auth account…');
  let charleneId;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: CHARLENE_EMAIL,
    email_confirm: true,
    user_metadata: { name: CHARLENE_NAME },
  });

  if (createErr) {
    if (!createErr.message.toLowerCase().includes('already')) {
      fail(`Auth create failed: ${createErr.message}`);
    }
    // Already exists — look up the id
    ok('Already exists — looking up existing user…');
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users?.find(u => u.email === CHARLENE_EMAIL);
    if (!existing) fail('Could not locate existing auth user');
    charleneId = existing.id;
  } else {
    charleneId = created.user.id;
  }
  ok(`Auth ID: ${charleneId}`);

  // ── 3. Upsert users row ──────────────────────────────────────
  step(3, 'Upserting users row (role = apprentice)…');
  const { error: userErr } = await supabase.from('users').upsert({
    id:          charleneId,
    business_id: businessId,
    name:        CHARLENE_NAME,
    email:       CHARLENE_EMAIL,
    role:        'apprentice',
    hearts_total: 10,
    level:       1,
    streak:      0,
    status:      'offline',
    ai_usage:    { claude: 0, gpt: 0, gemini: 0 },
  }, { onConflict: 'id' });
  if (userErr) fail(`User upsert failed: ${userErr.message}`);
  ok('Done');

  // ── 4. Locate BFB project (must exist after migration) ───────
  step(4, 'Locating BFB project…');
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', 'bfb')
    .single();
  if (projErr) fail(`BFB project not found — did the 011 migration run? ${projErr.message}`);
  const projectId = project.id;
  ok(`Project ID: ${projectId}`);

  // ── 5. Grant contribute access ───────────────────────────────
  step(5, 'Granting Charlene contribute access to BFB…');
  const { error: accessErr } = await supabase.from('project_access').upsert({
    user_id:      charleneId,
    project_id:   projectId,
    access_level: 'contribute',
    granted_by:   nickId,
  }, { onConflict: 'user_id,project_id' });
  if (accessErr) fail(`Access grant failed: ${accessErr.message}`);
  ok('Done');

  // ── 6. Set £50 monthly budget ────────────────────────────────
  step(6, 'Setting monthly budget (£50)…');
  const { error: budgetErr } = await supabase.from('user_budgets').upsert({
    user_id:            charleneId,
    monthly_budget_gbp: 50.00,
    soft_warn_pct:      80,
    hard_cap_pct:       100,
  }, { onConflict: 'user_id' });
  if (budgetErr) fail(`Budget set failed: ${budgetErr.message}`);
  ok('Done');

  // ── 7. Generate BFB teaching variant ─────────────────────────
  step(7, 'Generating BFB teaching variant via Anthropic…');
  const msg = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are creating a teaching masterprompt for an AI Guide that coaches apprentices working on the Back From Black (BFB) methodology.

BFB is a structured financial recovery programme for small businesses and sole traders in financial distress. The first apprentice is Charlene van der Westhuizen, working on building BFB client communications (email templates, client journeys).

Return a JSON object with exactly these keys:
{
  "identity": "How the Guide introduces itself and frames its role to the apprentice",
  "voice": "Tone and style — commercial, direct, supportive but not soft, results-focused",
  "methodology_context": "Core BFB principles Charlene must internalise to do good work",
  "product_context": "What BFB is, who it serves, what outcomes it produces",
  "apprentice_context": "Charlene's role, what she's building, and why it matters",
  "success_standards": "What excellent work looks like — the bar Charlene is working to",
  "escalation_triggers": "Specific situations where Charlene must stop and flag Nick rather than continue"
}

Return only the JSON object. No markdown, no commentary.`,
    }],
  });

  const raw = msg.content[0]?.text ?? '';
  let variant;
  try {
    variant = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) fail('Could not parse teaching variant JSON from Anthropic response');
    variant = JSON.parse(match[0]);
  }

  const tIn  = msg.usage.input_tokens;
  const tOut = msg.usage.output_tokens;
  const cost = (tIn / 1000 * 0.0024) + (tOut / 1000 * 0.012);

  // Deactivate any existing variants for BFB
  await supabase
    .from('teaching_masterprompts')
    .update({ is_active: false, status: 'inactive' })
    .eq('product_id', 'bfb');

  const { error: mpErr } = await supabase.from('teaching_masterprompts').insert({
    product_id:                'bfb',
    base_masterprompt_version: 'v1',
    content:                   variant,
    voice_profile: { identity: variant.identity, voice: variant.voice },
    status:                    'active',
    is_active:                 true,
    generated_by:              nickId,
  });
  if (mpErr) fail(`Teaching variant insert failed: ${mpErr.message}`);

  await supabase.from('api_usage_log').insert({
    user_id:     nickId,
    project_id:  projectId,
    feature:     'teaching_variant_generate',
    model:       'claude-sonnet-4-20250514',
    tokens_in:   tIn,
    tokens_out:  tOut,
    api_cost_gbp: cost,
  });
  ok(`Generated — ${tIn}+${tOut} tokens, £${cost.toFixed(4)}`);

  // ── 8. Assign Task 001 to Charlene ───────────────────────────
  step(8, 'Assigning Task 001 to Charlene…');
  const { error: taskErr } = await supabase
    .from('tasks')
    .update({ assigned_to: charleneId, user_id: charleneId, business_id: businessId })
    .eq('title', 'BFB Email Template Editor')
    .eq('project_id', projectId);
  if (taskErr) fail(`Task assignment failed: ${taskErr.message}`);
  ok('Done');

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n=== Setup complete ===');
  console.log(`Charlene: ${CHARLENE_EMAIL}`);
  console.log('She can sign in at https://os.caldr.ai/login using a magic link.');
  console.log('\nOne remaining manual step:');
  console.log('  Merge platform-v1 → main and deploy to Vercel.');
}

main().catch(err => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
