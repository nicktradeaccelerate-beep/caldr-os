# CLAUDE.md — Caldr OS
## AI-Powered Work OS for Remote VAs

---

## WHAT THIS IS

Caldr OS is a Next.js 15 PWA built for remote Virtual Assistants (VAs) and their managers/owners.
It combines VoIP calling, AI coaching, task management, and boss reporting into a single mobile-first app.

**Live domain:** os.caldr.ai  
**Local path:** `/Users/nicksinclair001/caldr-os/`  
**Status:** ~65% complete. Core flows built. Several sections stubbed.

---

## TECH STACK

- **Framework:** Next.js 14.2 (App Router)
- **Auth:** Supabase Auth (Email OTP) + @supabase/auth-helpers-nextjs
- **Database:** Supabase PostgreSQL with RLS
- **AI:** Anthropic Claude SDK (primary), OpenAI (fallback), Gemini (fallback)
- **VoIP:** Twilio (voice calls + WhatsApp)
- **Payments:** Stripe (4 plans)
- **Push notifications:** Web Push API + Supabase pg_net triggers
- **Offline:** idb-keyval + next-pwa
- **Email:** Resend (boss notifications)
- **Storage:** Supabase Storage (logos, recordings)
- **CSS:** Tailwind CSS

---

## APP STRUCTURE

### Routes

**Root:** `/` → redirects to `/calls`

**Public (unauthenticated):**
- `/login` — Email OTP auth
- `/onboard` — QR code provisioning: validates token → creates auth account → provisions Twilio number

**Dashboard (role: va):**
- `/calls` — VoIP calls, live coaching, BFB CRM map, recordings, AI pre/post-call briefs, supervisor modal
- `/tasks` — Offline-first task manager (idb-keyval), timers, categories, hearts priority
- `/ai` — Multi-model AI chat (Claude 10/day, GPT 20/day, Gemini 15/day), usage limits
- `/brief` — Claude-generated daily brief (Focus / Quick Win / Coaching / Motivation)
- `/boss` — Live task/call event log for owner, AI daily summary, WhatsApp/email notifications
- `/code` — Code editor stub (CodeEnv component, not functional)
- `/time` — Shift clock, hearts decay, milestones, invoice generator

**Master (role: owner | manager):**
- `/master/team` — Live VA status cards, score rings, supervisor controls
- `/master/library` — STUB
- `/master/access` — STUB
- `/master/training` — STUB

**Admin (role: owner):**
- `/admin/billing` — Plan comparison (Starter £12 / Pro £19 / Intelligence £35 / OS £29), Stripe checkout/portal
- `/admin/settings` — Brand Studio: accent colour, logo, font, AI name, custom domain
- `/admin/numbers` — STUB (number porting)

**Other:**
- `/offline` — PWA offline fallback

---

## API ROUTES

### AI
- `POST /api/ai/chat` — Multi-model chat, enforces daily limits, loads business context
- `POST /api/ai/brief` — Daily brief (Claude), yesterday's calls + today's tasks
- `POST /api/ai/pre-call-brief` — Pre-call AI brief using call history + BFB CRM context
- `POST /api/ai/post-call-debrief` — Post-call debrief with sentiment/flags feedback
- `POST /api/ai/code-review` — STUB
- `POST /api/ai/clippy` — STUB

### Twilio
- `POST /api/twilio/voice` — Inbound/outbound webhook, logs call, returns TwiML
- `POST /api/twilio/provision` — Provisions UK number + SIP credentials
- `POST /api/twilio/status` — Recording status callback
- `POST /api/twilio/conference` — STUB
- `POST /api/twilio/port` — STUB

### Calls
- `PATCH /api/calls/[id]/outcome` — Updates outcome/coaching note after debrief

### BFB CRM
- `GET /api/bfb/nearby-jobs` — Returns 8 nearest completed BFB jobs within ~5.5km (mocks if BFB creds absent)
- `POST /api/bfb/update-lead` — STUB (write-back after call)

### Boss
- `POST /api/boss/notify` — Triggered by DB trigger, sends WhatsApp/email via Resend
- `POST /api/boss/daily-summary` — Claude daily summary generation
- `POST /api/boss/updates` — STUB

### Push
- `POST /api/push/subscribe` — Store Web Push subscription
- `POST /api/push/send` — Send push notification

### QR Onboarding
- `POST /api/qr/generate` — STUB
- `POST /api/qr/validate` — Validates provision token

### Stripe
- `POST /api/stripe/checkout` — Create checkout session
- `POST /api/stripe/portal` — Create billing portal session
- `POST /api/stripe/webhook` — Handle subscription lifecycle

### Admin
- `PATCH /api/admin/settings` — Save brand settings
- `POST /api/admin/logo` — Upload logo to Supabase Storage

---

## DATABASE SCHEMA

### Core Tables

**businesses**
- id, name, short_name, accent_color, logo_url, knowledge, objections (JSONB)
- plan (Starter/Professional/Intelligence/OS)
- stripe_customer_id, stripe_subscription_id
- notify_whatsapp, notify_email, whatsapp_number, owner_whatsapp, owner_email
- crm_integration ('none' | 'supabase_shared')
- RLS: scoped to current_business_id()

**users**
- id (refs auth.users), business_id, name, email
- role ('va' | 'manager' | 'owner')
- uk_number, twilio_sip_username, twilio_sip_password, port_status
- status ('online' | 'on-call' | 'offline')
- hearts_total, level, streak, ai_usage (JSONB: {claude, gpt, gemini} daily counts)

**calls**
- id, business_id, va_id, twilio_call_sid (UNIQUE)
- contact_name, contact_number, direction (inbound|outbound), area
- duration_seconds, sentiment_score, intent_signal, ai_score
- flags (string[]), recording_url, transcript, coaching_note
- outcome, channel (phone|whatsapp), status (completed|active|missed)
- started_at, ended_at

**tasks**
- id, business_id, user_id, text, category (calls|admin|training|planning)
- hearts (1|2|3), estimate_mins, elapsed_seconds
- status (pending|active|done), due_date, started_at, completed_at

**numbers**
- id, business_id, user_id, number (UNIQUE E.164), twilio_sid
- type (mobile|landline), features (JSONB), whatsapp_verified, status

**boss_updates** — event log
- id, business_id, va_id, type (task_start|task_complete|working|daily_summary)
- message, task_id, call_id, sent_whatsapp, sent_email

**whatsapp_messages**
- id, business_id, va_id, contact_number, contact_name, message
- direction, lead_score, ai_response, status, bfb_pipeline_added

**provision_tokens** — QR onboarding (24h expiry)

**Phase 10 tables:** shifts, invoices, push_subscriptions, user_milestones, location_logs

### BFB CRM (external Supabase project)
- bfb_jobs: id, address, postcode, job_type, value, lat, lng, status, completed_at
- bfb_leads: contact-level records, notes, status, last_contact, quote values
- RLS: Caldr VA role read + selective update on leads

### SQL Files
- `/supabase/schema.sql` — main schema + RLS
- `/supabase/triggers.sql` — boss notify, heart decay, AI reset, birthday check
- `/supabase/migrations/009_bfb_crm.sql`
- `/supabase/migrations/010_phase10.sql`

---

## ENVIRONMENT VARIABLES

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WHATSAPP_NUMBER=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_INTEL_PRICE_ID=
STRIPE_OS_PRICE_ID=

# Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:hello@caldr.ai

# BFB CRM (optional)
BFB_SUPABASE_URL=
BFB_SUPABASE_SERVICE_KEY=

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
- Task Manager: CRUD, timers, offline sync (idb-keyval), categories, hearts
- Calls module: live call UI, pre/post brief, supervisor modal, BFB CRM map
- AI Hub: multi-model chat, usage limits, conversation history
- Daily Brief: Claude generation, stat cards, push nudge
- Boss Updates: live log, daily summary, WhatsApp/email settings
- Billing: plan cards, Stripe checkout/portal, feature matrix
- Brand Studio: accent colour, logo, font, AI name, domain, copy
- Time Tracker: shift clock, invoice generator UI
- Master Team view: VA status, score rings, supervisor
- Twilio: voice webhook, provisioning, SIP credentials
- Stripe: subscription lifecycle webhooks
- BFB integration: nearby jobs map, lead context in briefs, mock fallback
- PWA: offline page, caching, install prompt

### Stubbed / Incomplete
- `/admin/numbers` — number porting UI
- `/master/library` — coaching library
- `/master/access` — permission management
- `/master/training` — training modules
- `/code` — CodeEnv editor (UI only, no execution)
- `/api/ai/code-review` — skeleton only
- `/api/twilio/conference` — not hooked up
- `/api/twilio/port` — not built
- `/api/bfb/update-lead` — write-back after call
- `/api/auth/invite` — team invites

---

## KEY FLOWS

### Call Flow
1. Inbound call hits Twilio number
2. Twilio POST → `/api/twilio/voice`
3. Validates signature, logs call to DB, returns TwiML for conference + recording
4. Pre-call: AI brief loads from call history + BFB CRM context
5. Post-call: Debrief card with Claude feedback, outcome selector
6. Boss notify trigger fires on outcome update

### Daily Brief
- Triggered on-demand in UI (no cron yet)
- Data: yesterday's calls (count, sentiment), today's tasks, user weak area
- Claude returns 4 sections: Focus / Quick Win / Coaching / Motivation

### Boss Notify Trigger
- DB trigger fires on tasks.status change → 'done' or 'active'
- HTTP POST to `/api/boss/notify` via pg_net
- Sends WhatsApp/email if configured, inserts boss_updates row

### Task Offline Sync
- idb-keyval: 'caldr:task:' prefix, 'caldr:pending' queue
- Optimistic update locally → Supabase when online
- On reconnect: sync() flushes pending writes

### QR Onboarding
1. Admin generates QR token (24h expiry)
2. VA scans → `/onboard?token=XXX`
3. Validates token, creates auth account
4. Provisions UK Twilio number + SIP credentials
5. User lands on `/calls` ready to work

---

## STRIPE PLAN MODEL

| Plan | Price | Key Features |
|------|-------|-------------|
| Starter | £12/mo | Calls, tasks, basic AI |
| Professional | £19/mo | + Daily brief, boss updates |
| Intelligence | £35/mo | + Full AI hub, coaching |
| OS | £29/mo | + Full OS mode |

Feature gates via `PLAN_FEATURES[planId]` array + `hasFeature()` helper.

---

## PWA / OFFLINE STRATEGY

- next-pwa with specific cache strategies
- AI API calls: NetworkOnly (never cache)
- Supabase REST: NetworkFirst, 60s cache
- App pages: NetworkFirst, 8s timeout, fallback to `/offline`
- Service Worker: pre-configured, skipWaiting enabled

---

## WHAT TO BUILD NEXT — PRIORITY ORDER

1. **Deploy to production** — run Supabase schema + migrations, configure all env vars, deploy to Vercel
2. **Complete stubs** — number porting, coaching library, BFB write-back, team invites
3. **Cron jobs** — nightly heart decay + AI usage reset (Supabase pg_cron)
4. **Real-time** — Supabase Realtime subscriptions for live call events (frontend polling not implemented)
5. **Code module** — wire CodeEnv to actual execution environment
6. **/master/training** — training modules/paths for VA onboarding

---

## DESIGN SYSTEM

- Mobile-first PWA (primary device: iPhone)
- Dark green primary: `#1B4332`
- Accent: configurable per business (Brand Studio)
- Fonts: DM Sans (default) / Inter / System
- Tailwind CSS + inline styles in components
- No UI library — custom components throughout
