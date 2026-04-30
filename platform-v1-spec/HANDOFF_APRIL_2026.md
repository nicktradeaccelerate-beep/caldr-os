# Caldr OS — Project Handoff
## April 2026 | For Claude collaboration

---

## What exists and where

### Two separate apps

**1. Autonomous Ledger** — `~/autonomous-ledger/`
- Deployed: `autonomous-ledger.vercel.app`
- GitHub: `nicktradeaccelerate-beep/autonomous-ledger`
- What it is: Nick's personal operating dashboard. Single HTML file (`index.html`) + `data.json`. Tabs: Projects, Team, Leaderboard, Partners, Sites, Masterprompt, Voice, Agent, **Platform (new)**.
- The Platform tab (tab 09) was just added — it links out to Caldr OS for apprentice management.

**2. Caldr OS** — `~/caldr-os/`
- Deployed: `caldros.vercel.app`
- GitHub: `nicktradeaccelerate-beep/caldr-os`
- What it is: Next.js 14 App Router PWA. Two user surfaces built inside it:
  - **Operator surface** (Nick): calls, tasks, AI hub, brief, boss updates, Platform management
  - **Apprentice surface** (Charlene): Kanban dashboard, task detail, AI Guide, portfolio

---

## What was built in this session (Platform V1)

### Database (Supabase project: lnzjtxkiypwebswglwvs)
All tables live. Migration `supabase/migrations/011_platform_v1_foundation.sql` was run successfully.

New tables: `projects`, `project_access`, `workspaces`, `actions`, `submissions`, `teaching_masterprompts`, `api_usage_log`, `user_budgets`, `narrative_logs`, `escalations`, `email_templates`

Tasks table extended with: `project_id`, `workspace_id`, `title`, `description`, `success_criteria`, `resources`, `difficulty`, `assigned_to`, `kanban_status`

### Users created
- **Nick Sinclair** — `nick.tradeaccelerate@gmail.com` — role: `owner`
- **Charlene van der Westhuizen** — `charlene@devcor.co.za` — role: `apprentice`
- BFB project seeded, Charlene granted `contribute` access, £50/month budget set, teaching variant generated.

### Auth
- Login is password-based (`signInWithPassword`) at `caldros.vercel.app/login`
- Magic link was abandoned due to redirect loop issues with Supabase + Next.js middleware
- Middleware uses service role key for role lookup (bypasses RLS) — this was the key fix

### Apprentice surface (Charlene logs in here)
- `/dashboard` — Kanban board (backlog / doing / in_review / approved / archived)
- `/tasks/[id]` — Task detail with success criteria checklist, SubmitFlow modal (4 steps: checklist → self-check → narrative → confirm)
- `/guide` — AI Guide chat powered by BFB teaching variant, budget enforcement, escalation after 30min stuck
- `/portfolio` — All past submissions with feedback

### Operator/platform surface (Nick logs in here)
- `/platform` — Pending escalations, review queue, latest narrative
- `/platform/apprentices` — List of all apprentices
- `/platform/apprentices/[id]` — Budget management, project access toggle, action ledger (revert/reset)
- `/platform/review` — Approve / request changes / archive submissions
- `/platform/costs` — Monthly AI spend by user/feature/model
- `/platform/products` — BFB product card
- `/platform/products/[id]/teaching` — Teaching variant editor + regenerate
- `/bfb/templates` — BFB email template list
- `/bfb/templates/[id]` — Template editor with preview, autosave, test send

### Key files
- `middleware.ts` — role-based routing, service role lookup
- `app/(apprentice)/layout.tsx` — apprentice shell with budget bar
- `app/(dashboard)/layout.tsx` — operator shell with sidebar nav
- `lib/ai/claude.ts` — Anthropic wrapper with cost tracking
- `supabase/migrations/011_platform_v1_foundation.sql` — all Platform V1 tables

---

## Roles
- `owner` — Nick. Full access to everything.
- `operator` — future team members. Same as owner minus admin.
- `manager` — existing role. Operator-level access.
- `va` — existing role. Calls, tasks, AI hub only.
- `apprentice` — Charlene. Dashboard, guide, portfolio only.

---

## What Nick wants to build next

### Feature: Live Ledger View with Annotation

Nick wants to bring the **autonomous ledger** (or the BFB project data within it) into Caldr OS so that:

1. The live ledger view is visible inside the platform — not a link out, but embedded or rendered within the UI
2. Users (Nick and/or Charlene) can **click on any element** — a project, a metric, a line item, a status
3. A **side panel opens on the right** showing:
   - Notes tied to that specific element
   - A discussion thread
   - Possible actions or edits
4. The interaction model is like a **legal document with margin annotations** — the document is on the left, highlighted items have corresponding notes on the right
5. Clients may eventually be able to see what's highlighted

This is essentially a **document annotation layer** on top of the ledger data.

### What needs deciding before building
- Should it embed the actual `autonomous-ledger.vercel.app` page in an iframe (quick but limited), or pull `data.json` and render it natively inside Caldr OS (more control)?
- Should annotations be stored per-element (keyed by element ID or path in `data.json`), or per-document?
- Who can annotate — Nick only, or Charlene too?
- Are annotations visible to the ledger's "client" view, or internal only for now?

---

## Environment
- Local path: `/Users/nicksinclair001/caldr-os/`
- Node: 24.14.1
- Next.js: 14.2.35
- Supabase: `@supabase/supabase-js` v2, `@supabase/auth-helpers-nextjs` v0.15
- Anthropic: `@anthropic-ai/sdk` v0.89
- `.env.local` has all keys set (Supabase URL/keys, Anthropic, Resend, CRON_SECRET)
- Vercel env vars match `.env.local`
