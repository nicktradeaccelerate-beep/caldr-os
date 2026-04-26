# Ledger Platform V1 — Complete Build Pack

**The Newton & Sinclair Operating Ledger, extended into a multi-tenant collaborative platform.**

**Host application:** Caldr OS (`/Users/nicksinclair001/caldr-os`) — Next.js 14, Supabase, Vercel, Anthropic API, Twilio voice

---

## Documents in this pack

### Master spec
- **`LEDGER_PLATFORM_V1.md`** — The canonical specification. Architecture, three user roles (operator/apprentice/client), per-project access, action ledger, submission/review flow, visual UI principles, cost monitoring, narrative log, runbook integration, off-ramp planning, build phasing.

### Detailed sub-specs
- **`VISUAL_UI_SPEC_V1.md`** — Complete visual specification for the apprentice surface: kanban dashboard, live preview, visual diff, diagram-based guide responses, progress visualisation, portfolio gallery, conversation context pills, achievement notifications, aesthetic principles, implementation priority.

- **`TEACHING_VARIANT_MASTERPROMPT_TEMPLATE.md`** — How the operator masterprompt transforms into apprentice-teaching variants per product. Generator prompt, output format, example for BFB, storage and versioning, voice profile editing flow.

- **`CLIENT_SURFACE_V2_PLACEHOLDER.md`** — Spec for the V2 client-facing surface. Not built in V1 but the architectural decisions that V1 must support to make V2 additive (not a rewrite).

### Build handoff
- **`CLAUDE_CODE_HANDOFF_LEDGER_V1.md`** — Day-by-day build plan for Claude Code. 16 days of focused work extending the existing Caldr OS codebase via feature branch and preview deployment, with full acceptance test list.

### Operational
- **`OPERATIONS_RUNBOOK.md`** — Failure recovery doc for Nick. Common failure modes with diagnostic steps, fixes, and prevention notes.

### User-facing
- **`CHARLENE_ONBOARDING.md`** — Welcome document for Charlene's first day.

- **`CHARLENE_TASK_001_email_templates.md`** — Her first task. Building the BFB email template editor as a real feature that ships when approved.

---

## Architecture note

The "existing Ledger" referenced throughout the spec is **Caldr OS** — the Next.js 14 app in this repository. It already has:
- Supabase auth (multi-user, role-based via `users.role`)
- Anthropic API integration (Claude chat in `/app/(dashboard)/ai/`, masterprompt in `/app/(dashboard)/brief/`)
- Voice/transcription (Twilio, `/app/(dashboard)/calls/`)
- Autonomous agent module (`/app/(dashboard)/boss/`)
- Auto-scheduler (`/app/api/boss/daily-summary/`)
- BFB CRM module (`/app/api/bfb/`)
- Existing task system (`tasks` table)
- Existing boss_updates log (action logging pattern)

The static `autonomous-ledger` (single HTML + data.json) is Nick's portfolio dashboard — separate, not the build target.

---

## Recommended read order

1. `LEDGER_PLATFORM_V1.md` — spine of everything
2. `CLAUDE_CODE_HANDOFF_LEDGER_V1.md` — how it gets built
3. `VISUAL_UI_SPEC_V1.md` — apprentice experience
4. `TEACHING_VARIANT_MASTERPROMPT_TEMPLATE.md` — AI teaching layer
5. `CLIENT_SURFACE_V2_PLACEHOLDER.md` — where this goes next
6. `OPERATIONS_RUNBOOK.md` — operational reference
7. `CHARLENE_ONBOARDING.md` + `CHARLENE_TASK_001_email_templates.md` — end-user experience
