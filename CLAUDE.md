# CLAUDE.md — Caldr OS
## AI-Powered Work OS for Remote VAs + Apprentice Platform

---

## WHAT THIS IS

Caldr OS is a Next.js 14 PWA with two integrated surfaces:

1. **VA Workspace** — for remote Virtual Assistants (VAs): VoIP calling, AI coaching, task management, boss reporting
2. **Apprentice Platform** — for apprentices (Charlene): task kanban, AI guide, portfolio, code editor with Teach mode

**Live URL:** caldros.vercel.app (Vercel deployment)  
**Target domain:** os.caldr.ai  
**Local path:** `/Users/nicksinclair001/caldr-os/`  
**GitHub:** nicktradeaccelerate-beep/caldr-os  
**Status:** ~80% complete. Core flows built and live. Stubs remain in master library/training/access.

---

## TECH STACK

- **Framework:** Next.js 14.2 (App Router), TypeScript strict
- **Auth:** Supabase Auth (Email OTP magic link)
- **Database:** Supabase PostgreSQL with RLS
- **AI:** Anthropic Claude SDK (`claude-sonnet-4-20250514`) — primary. OpenAI + Gemini as fallbacks in AI hub.
- **VoIP:** Twilio (voice calls + WhatsApp)
- **Payments:** Stripe (4 plans)
- **Push notifications:** Web Push API + Supabase pg_net triggers
- **Offline:** idb-keyval + next-pwa
- **Email:** Resend (boss notifications)
- **Storage:** Supabase Storage (logos, recordings)
- **Code editor:** Monaco (`@monaco-editor/react`, dynamic import)
- **Styling:** Inline styles throughout — no UI library. Tailwind also available but rarely used.

---

## ROUTE STRUCTURE

### Public (unauthenticated)
- `/login` — Email OTP auth
- `/onboard?token=XXX` — QR provisioning: validates token → creates account → provisions Twilio number

### VA Dashboard (`app/(dashboard)/`, role: va)
- `/calls` — VoIP calls, live coaching, BFB CRM map, recordings, AI pre/post-call briefs, supervisor modal
- `/tasks` — Offline-first task manager (idb-keyval), timers, categories, hearts priority
- `/ai` — Multi-model AI chat (Claude 10/day, GPT 20/day, Gemini 15/day), usage limits
- `/brief` — Claude daily brief (Focus / Quick Win / Coaching / Motivation)
- `/boss` — Live task/call event log for owner, AI daily summary, WhatsApp/email notifications
- `/code` — Code editor (CodeEnv component with split preview)
- `/time` — Shift clock, hearts decay, milestones, invoice generator

### Apprentice (`app/(apprentice)/`, role: apprentice)
- `/dashboard` — Kanban board (backlog / doing / in_review / approved columns)
- `/guide` — GuidePanel standalone — AI coaching chat loaded with teaching variant
- `/portfolio` — Submitted and approved work record
- `/apprentice/code` — Monaco code editor with Teach/Generate guide chat, sandboxed iframe runtime
- `/apprentice-tasks/[id]` — Three-column task detail: left rail (brief/criteria/resources), centre (work area/self-check/submit), right (embedded GuidePanel)

### Master (`app/(dashboard)/master/`, role: owner | manager)
- `/master/team` — Live VA status cards, score rings, supervisor controls
- `/master/library` — STUB
- `/master/access` — STUB
- `/master/training` — STUB

### Platform Operator (`app/(dashboard)/platform/`, role: operator | owner)
- `/platform` — Overview: pending reviews, escalations, AI spend, apprentice count
- `/platform/apprentices` — Apprentice cards with task status breakdown
- `/platform/costs` — API usage breakdown by feature, cost per call, budget bars
- `/platform/review` — Submission review queue with DiffViewer for state changes

### Admin (`app/(dashboard)/admin/`, role: owner)
- `/admin/billing` — Plan comparison (Starter £12 / Pro £19 / Intelligence £35 / OS £29), Stripe checkout/portal
- `/admin/settings` — Brand Studio: accent colour, logo, font, AI name, custom domain
- `/admin/numbers` — VA invite form (creates account + sends magic link) + number provisioning + feature toggles

### Other
- `/offline` — PWA offline fallback

---

## ROLE ROUTING (middleware.ts)

Middleware checks `users.role` from Supabase on every request:
- `va` → allowed `/calls`, `/tasks`, `/ai`, `/brief`, `/boss`, `/code`, `/time`
- `apprentice` → allowed `/dashboard`, `/guide`, `/portfolio`, `/apprentice/*`, `/apprentice-tasks/*`
- `manager` → VA routes + `/master/*`
- `owner` / `operator` → all routes including `/admin/*`, `/platform/*`
- Unauthenticated → redirect to `/login`

---

## API ROUTES

### AI
- `POST /api/ai/chat` — Multi-model chat, daily limits, business context
- `POST /api/ai/brief` — Daily brief (Claude). `regenerate: true` also triggers teaching variant refresh.
- `POST /api/ai/pre-call-brief` — Pre-call brief using call history + BFB CRM context
- `POST /api/ai/post-call-debrief` — Post-call debrief with sentiment/flags
- `POST /api/ai/code-review` — STUB

### Platform / Apprentice
- `POST /api/guide/self-check` — Scores apprentice narrative against task success criteria
- `POST /api/platform/regenerate-teaching-variants` — Regenerates teaching variant masterprompts for active products
- `POST /api/apprentice/code-assist` — Streaming Claude SSE endpoint for code editor guide chat. Mode: `teach` | `generate`.

### Twilio
- `POST /api/twilio/voice` — Inbound/outbound webhook, logs call, returns TwiML
- `POST /api/twilio/provision` — Provisions UK number + SIP credentials
- `POST /api/twilio/status` — Recording status callback
- `POST /api/twilio/conference` — STUB
- `POST /api/twilio/port` — STUB

### BFB CRM
- `GET /api/bfb/nearby-jobs` — Returns 8 nearest completed BFB jobs (queries real `client_jobs` table when BFB env vars set; falls back to Chichester-area mock pins)
- `POST /api/bfb/update-lead` — STUB

### Boss
- `POST /api/boss/notify` — Sends WhatsApp/email notification, inserts boss_updates row
- `POST /api/boss/daily-summary` — Claude daily summary generation

### Admin
- `POST /api/admin/invite` — Creates VA user account + sends magic link. Body: `{ name, email, role? }`. Auth: bearer token (owner/manager only).
- `PATCH /api/admin/settings` — Save brand settings
- `POST /api/admin/logo` — Upload logo to Supabase Storage

### QR Onboarding
- `POST /api/qr/generate` — Creates provision token. Body: `{ userId, businessId }`.
- `POST /api/qr/validate` — Validates token, marks used, returns `{ valid, userId, businessId }`.

### Stripe
- `POST /api/stripe/checkout` — Create checkout session
- `POST /api/stripe/portal` — Create billing portal session
- `POST /api/stripe/webhook` — Handle subscription lifecycle

### Push
- `POST /api/push/subscribe` — Store Web Push subscription
- `POST /api/push/send` — Send push notification

---

## DATABASE SCHEMA

### Core Caldr OS Tables (Supabase project: lnzjtxkiypwebswglwvs)

**businesses** — `id, name, short_name, accent_color, logo_url, knowledge, objections(JSONB), plan, stripe_customer_id, stripe_subscription_id, notify_whatsapp, notify_email, owner_whatsapp, owner_email, crm_integration('none'|'supabase_shared')`

**users** — `id(refs auth.users), business_id, name, email, role('va'|'manager'|'owner'|'apprentice'|'operator'), uk_number, twilio_sip_username, twilio_sip_password, status('online'|'on-call'|'offline'), hearts_total, level, streak, ai_usage(JSONB)`

**calls** — `id, business_id, va_id, twilio_call_sid(UNIQUE), contact_name, contact_number, direction, area, duration_seconds, sentiment_score, intent_signal, ai_score, flags(text[]), recording_url, transcript, coaching_note, outcome, channel, status, started_at, ended_at`

**tasks** — `id, business_id, user_id, text, category, hearts(1|2|3), estimate_mins, elapsed_seconds, status('pending'|'active'|'done'), due_date, started_at, completed_at` + Platform V1 extensions: `project_id, workspace_id, title, description, success_criteria(text[]), resources(JSONB), difficulty(1-5), assigned_to, kanban_status('backlog'|'doing'|'in_review'|'approved'|'archived')`

**numbers** — `id, business_id, user_id, number(E.164 UNIQUE), twilio_sid, type, features(JSONB), whatsapp_verified, status`

**boss_updates** — `id, business_id, va_id, type, message, task_id, call_id, sent_whatsapp, sent_email`

**provision_tokens** — `id, business_id, user_id, token(UNIQUE), used(bool), expires_at`

### Platform V1 Tables (migration 011)
**projects** — `id, business_id, name, slug, description, product_context, is_active`  
**workspaces** — `id, user_id, project_id, seed_state(JSONB), current_state(JSONB), last_activity`  
**actions** — `id, user_id, project_id, workspace_id, action_type, target_table, target_id, before_state, after_state, actor_role, reversible`  
**submissions** — `id, task_id, user_id, workspace_id, narrative, self_check_score, submitted_at, review_status, reviewer_id, feedback`  
**teaching_variants** — `id, product_id, masterprompt, voice_notes, generated_at, is_active`  
**user_budgets** — `id, user_id, monthly_budget_gbp`  
**api_usage_log** — `id, user_id, feature, model, tokens_in, tokens_out, api_cost_gbp, created_at`

### BFB CRM (external Supabase project: jtgwdtpscalgdqwulxpo)
Real BFB lead intelligence database. Key table:  
**client_jobs** — `id, client_name, address, postcode, county, latitude, longitude, finish_type, property_type, job_date, is_showcase, notes, crm_touch_type, crm_last_touch_at`

Caldr OS reads this via `lib/bfb/nearbyJobs.ts` using `BFB_SUPABASE_URL` + `BFB_SUPABASE_SERVICE_KEY`.

### SQL Files
- `/supabase/schema.sql` — main schema + RLS
- `/supabase/triggers.sql` — boss notify, heart decay, AI reset
- `/supabase/migrations/009_bfb_crm.sql`
- `/supabase/migrations/010_phase10.sql`
- `/supabase/migrations/011_platform_v1_foundation.sql`

---

## ENVIRONMENT VARIABLES

```
# Supabase (Caldr OS project)
NEXT_PUBLIC_SUPABASE_URL=https://lnzjtxkiypwebswglwvs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=          # Required for brief, guide, code-assist
OPENAI_API_KEY=             # Optional — GPT tab in AI hub
GEMINI_API_KEY=             # Optional — Gemini tab

# Twilio (required for calls)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=        # E.164 e.g. +441234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_INTEL_PRICE_ID=
STRIPE_OS_PRICE_ID=

# BFB CRM (real data — leave blank to use Chichester mock pins)
BFB_SUPABASE_URL=https://jtgwdtpscalgdqwulxpo.supabase.co
BFB_SUPABASE_SERVICE_KEY=

# Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:hello@caldr.ai

# App
NEXT_PUBLIC_URL=https://os.caldr.ai
CRON_SECRET=

# Email
RESEND_API_KEY=
```

---

## WHAT IS BUILT vs STUBBED

### Built & Functional
- Auth: Email OTP + QR onboard + Twilio provision
- VA invite flow: `/admin/numbers` → creates account + sends magic link
- Task Manager: CRUD, timers, offline sync (idb-keyval), hearts
- Calls module: live call UI, pre/post brief, BFB CRM map, supervisor modal
- AI Hub: multi-model chat, usage limits, conversation history
- Daily Brief: Claude generation, stat cards
- Boss Updates: live log, daily summary, WhatsApp/email
- Billing: Stripe checkout/portal, plan comparison
- Brand Studio: accent colour, logo, font, AI name, domain
- Time Tracker: shift clock, invoice generator UI
- Master Team view: VA status, score rings
- Twilio: voice webhook, provisioning, SIP credentials
- BFB CRM: real `client_jobs` data when env vars set, Chichester mock fallback
- Platform V1 (operator surface): overview, apprentice cards, cost tracking, submission review with DiffViewer
- Apprentice workspace: kanban dashboard, guide chat, portfolio, task detail (three-column, BFB editorial identity when project is BFB)
- Apprentice code editor: Monaco + sandboxed iframe + Teach/Generate Claude chat + "Apply to file"
- PWA: offline page, caching, install prompt

### BFB Editorial Identity (task detail, project slug === 'bfb')
- Fonts: Cormorant Garamond (headings), IM Fell English (body), Courier Prime (mono) — loaded from Google Fonts
- Palette: parchment `#F5F0E8`, obsidian `#1A1A1A`, antique gold `#B8941F`, oxblood `#722F37`
- Copy: no exclamation marks, Mayfair register, no contractions

### Stubbed / Incomplete
- `/master/library` — coaching library
- `/master/access` — permission management
- `/master/training` — training modules
- `/api/twilio/conference` — not hooked up
- `/api/twilio/port` — number porting
- `/api/bfb/update-lead` — write-back after call
- `/api/ai/code-review` — skeleton only
- Supabase cron jobs — heart decay + AI usage reset (triggers in schema, not scheduled yet)
- Real-time subscriptions — Supabase Realtime not wired to frontend (polling works)

---

## KEY FLOWS

### VA Call Flow
1. Inbound call hits Twilio number → `POST /api/twilio/voice`
2. Validates signature, logs call, returns TwiML conference + recording
3. Pre-call brief: call history + BFB CRM context → Claude
4. Post-call: debrief card, outcome selector → boss notify trigger

### Apprentice Task Flow
1. Nick assigns task via Supabase dashboard (kanban_status: 'backlog')
2. Charlene sees it on `/dashboard` kanban
3. Clicks task → `/apprentice-tasks/[id]` three-column view
4. Starts task → status: 'doing', action logged
5. Writes narrative → runs self-check (Claude scores vs criteria)
6. Submits → status: 'in_review', submission row created
7. Nick reviews at `/platform/review`, approves or gives feedback

### Apprentice Code Editor
1. Charlene opens `/apprentice/code`
2. File tree (localStorage per user): default index.html, style.css, script.js
3. Monaco editor, Courier Prime font
4. Teach mode (default): Claude refuses code on first ask, walks through reasoning, max 5 lines
5. Generate mode: standard code generation
6. Run ▶: builds srcdoc, inlines CSS/JS, executes in sandboxed iframe (allow-scripts only)
7. React/JSX: Babel standalone + React 18 UMD injected from unpkg
8. "Apply to file" button on code blocks → writes to active file

### VA Invite Flow
1. Owner goes to `/admin/numbers`
2. Enters name + email in Invite section
3. `POST /api/admin/invite` → creates Supabase auth user → inserts users row (role: va) → generates magic link
4. Owner copies link, sends to new VA
5. VA clicks link → logged in, lands on `/calls`
6. Owner provisions number from same page dropdown → `POST /api/twilio/provision`

### Daily Brief
- On-demand from `/brief` page
- `regenerate: true` (explicit button click) also triggers teaching variant refresh for owner/operator role
- Claude returns 4 sections: Focus / Quick Win / Coaching / Motivation

---

## COMPONENT ARCHITECTURE

### Shared
- `components/shared/ThreeColumnWorkSurface.tsx` — resizable three-column layout. Left rail (drag handle, 200–440px), centre (flex:1), right panel (collapsible). Mobile: tab switcher (Brief/Work/Guide). Widths persisted to localStorage via `storageKey` prop.
- `components/shared/DiffViewer.tsx` — before/after JSON diff display. Changed rows highlighted amber/red/green; unchanged collapsed in `<details>`.

### Apprentice
- `components/apprentice/GuidePanel.tsx` — AI guide chat. `embedded` prop for use inside ThreeColumnWorkSurface (switches to `height: 100%`, removes left border). Loads teaching variant from active workspace product.
- `components/apprentice/SubmitFlow.tsx` — submission modal (narrative + action logging + status update)
- `components/apprentice/ProgressWidget.tsx` — sidebar progress widget
- `components/apprentice/code/FileTree.tsx` — sandbox file tree with add/delete
- `components/apprentice/code/TeachGuideChat.tsx` — streaming Claude chat with Teach/Generate mode toggle, code block parser, "Apply to file"

### Code / Editor
- `components/code/CodeEnv.tsx` — VA code editor with split-pane mode (editor + LivePreview)
- `components/code/LivePreview.tsx` — `<iframe sandbox="allow-scripts">` with 400ms debounced srcdoc. `buildSrcdoc()` wraps content in full HTML. `mdToHtml()` markdown converter.

### Clippy
- `components/clippy/ClippyCharacter.tsx` — animated character, moods: happy/thinking/alert

---

## HOOKS
- `hooks/useIsMobile.ts` — `window.innerWidth < 768`, resize listener
- `hooks/useSandboxFiles.ts` — localStorage file management for apprentice code editor. Keyed `caldr:sandbox:{userId}`. Default files: index.html, style.css, script.js.

---

## AI / CLAUDE INTEGRATION

### lib/ai/claude.ts
- `generateText(prompt, systemPrompt, maxTokens)` → string
- `generateWithCost(prompt, systemPrompt, maxTokens)` → `{ text, tokensIn, tokensOut, costGbp }`
- `generateConversation(messages, systemPrompt, maxTokens)` → `{ text, tokensIn, tokensOut, costGbp }`
- Model: `claude-sonnet-4-20250514`
- Pricing: $3/1M input, $15/1M output → converted to GBP at ~£0.80/USD

### lib/ai/prompts.ts
- `PROMPTS.dailyBrief(user, stats, business)` — daily brief prompt
- `PROMPTS.preCallBrief(...)` — pre-call context
- `PROMPTS.postCallDebrief(...)` — debrief prompt

### Streaming (code-assist only)
- `app/api/apprentice/code-assist/route.ts` uses `anthropic.messages.stream()` → SSE
- Client reads via `ReadableStream` + SSE parsing
- Cost logged to `api_usage_log` after stream completes

---

## DESIGN SYSTEM

- Mobile-first PWA (primary device: iPhone)
- Dark green primary: `#1B4332`
- Accent: configurable per business (Brand Studio), stored as `businesses.accent_color`
- CSS variables: `--accent`, `--accent-light`, `--accent-pale`, `--ink`, `--ink-2`, `--ink-3`, `--border`, `--white`, `--card`, `--ground`, `--rose`
- Fonts: DM Sans (default) / Inter / System — set in Brand Studio
- BFB project override: Cormorant Garamond / IM Fell English / Courier Prime
- No UI library — all custom components with inline styles

---

## PEOPLE

- **Nick Sinclair** — owner/operator, builds in Claude Code
- **Charlene** — apprentice (charlene@devcor.co.za), BFB project, £50/month AI budget
- **Rene** — VA (to be provisioned), PTO outreach + calls

---

## WHAT TO BUILD NEXT

1. **Twilio credentials in Vercel** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` → enables calls for all VAs
2. **Provision Rene's number** — invite via `/admin/numbers`, then provision
3. **Cron jobs** — Supabase pg_cron: nightly heart decay + AI usage reset (SQL in triggers.sql, just needs scheduling)
4. **Real-time** — Supabase Realtime for live call events on `/calls` (currently polling)
5. **Master stubs** — library, access, training modules
6. **BFB write-back** — `POST /api/bfb/update-lead` after call outcome
7. **Number porting** — `POST /api/twilio/port` + porting UI in `/admin/numbers`
