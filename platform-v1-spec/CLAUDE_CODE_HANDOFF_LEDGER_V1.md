# CLAUDE_CODE_HANDOFF_LEDGER_V1.md

**Project:** Newton & Sinclair Operating Ledger — Platform Extension V1
**Build target:** `/Users/nicksinclair001/caldr-os` (Next.js 14, Supabase, Vercel)
**Deployment:** autonomous-ledger.vercel.app
**Estimated build:** 16 focused days
**Method:** Feature branch `platform-v1`, preview deployment on Vercel, merge to main when acceptance tests pass

---

## Before you start: read these first

1. `LEDGER_PLATFORM_V1.md` — master spec, architecture, all three roles
2. `VISUAL_UI_SPEC_V1.md` — apprentice UI requirements
3. `TEACHING_VARIANT_MASTERPROMPT_TEMPLATE.md` — AI teaching layer
4. `CLIENT_SURFACE_V2_PLACEHOLDER.md` — architectural constraints to not violate
5. This document — build order and acceptance tests

---

## Existing codebase orientation

Key existing paths to understand before changing anything:

| Path | What it is |
|---|---|
| `/app/(dashboard)/` | All operator dashboard routes |
| `/app/(dashboard)/ai/` | Existing Claude chat |
| `/app/(dashboard)/brief/` | Masterprompt system |
| `/app/(dashboard)/boss/` | Autonomous agent module |
| `/app/(dashboard)/bfb/` | BFB CRM module |
| `/app/(dashboard)/calls/` | Twilio voice |
| `/supabase/migrations/` | All database migrations |
| `/supabase/schema.sql` | Full schema reference |
| `/app/api/` | All API routes |
| `/components/` | Shared components |

Key existing tables: `users` (role TEXT), `tasks`, `boss_updates`, `businesses`, `calls`

---

## Build phases

---

### Phase 1 — Foundation (Days 1–3)

**Goal:** Multi-role auth, project access model, platform routing. Nothing visible to apprentices yet — just the infrastructure.

**Day 1: Branch + schema**

- Create feature branch: `git checkout -b platform-v1`
- Create migration `011_platform_v1_foundation.sql`:
  - `projects` table (id, name, slug, module_type, description, created_by, created_at)
  - `project_access` table (id, user_id, project_id, access_level, granted_by, granted_at, notes)
  - `workspaces` table (id, user_id, project_id, seed_version, created_at, reset_at)
  - `actions` table (id, user_id, project_id, workspace_id, action_type, target_table, target_id, before_state jsonb, after_state jsonb, actor_role, reversible, reverted_at, created_at)
  - `submissions` table (id, user_id, project_id, workspace_id, task_id, status, diff_summary jsonb, narrative text, self_check_results jsonb, video_link text, submitted_at, reviewed_at, reviewed_by, review_outcome, review_notes, created_at)
  - `teaching_masterprompts` table (id, product_id, base_masterprompt_version, content jsonb, generated_at, generated_by, is_active)
  - `api_usage_log` table (id, user_id, project_id, feature, model, tokens_in, tokens_out, api_cost_gbp, created_at)
  - `user_budgets` table (id, user_id, monthly_budget_gbp, soft_warn_pct, hard_cap_pct, created_at)
  - RLS policies for all new tables (operator = full access, apprentice = own rows + assigned projects only)
- Seed BFB project row
- Run migration, verify schema

**Day 2: Role-based routing**

- Middleware update: after auth check, read `users.role` → set routing context
- Create `/app/(apprentice)/` route group — separate layout from operator dashboard
- `/app/(apprentice)/layout.tsx` — apprentice shell (sidebar, top nav, context)
- Auth redirect logic: `operator` → `/app/(dashboard)/`, `apprentice` → `/app/(apprentice)/`, anything else → `/login`
- Do NOT break existing operator routing

**Day 3: Operator platform panel**

- `/app/(dashboard)/platform/` — new operator section
- `/app/(dashboard)/platform/apprentices/` — list of apprentices, their project access, budget usage
- `/app/(dashboard)/platform/products/` — product modules, teaching variant status
- Basic data reads only — no complex UI yet

**Phase 1 acceptance tests:**
- [ ] Operator logs in → lands on existing dashboard, nothing changed
- [ ] New `apprentice` role user logs in → lands on `/app/(apprentice)/`
- [ ] Nick sees `/platform/` in nav
- [ ] `project_access` table exists with correct schema
- [ ] `actions` table exists with correct schema
- [ ] BFB project exists in `projects` table

---

### Phase 2 — Apprentice surface (Days 4–7)

**Goal:** Charlene can log in, see her assigned projects, view tasks, use the Guide.

**Day 4: Apprentice dashboard — Kanban**

- `/app/(apprentice)/dashboard/` — entry point
- Fetch tasks where: `project_access` grants access to the project, task is assigned to this user or unassigned in their project
- Kanban board: Backlog | Doing | In Review | Approved | Archived
- Task cards: title, project tag, due date, status badge
- Empty state: instructional, not blank

**Day 5: Task detail view**

- `/app/(apprentice)/tasks/[id]/` — full task view
- Show: brief, success criteria, linked resources, current status
- "Start task" → moves to Doing, creates workspace if not exists
- Action ledger middleware: wrap task state changes in logged actions

**Day 6: Apprentice Guide (teaching variant)**

- `/app/(apprentice)/guide/` — Guide chat for apprentices
- Route: calls `/api/guide/chat` with role context
- `/api/guide/chat` — voice routing: `(role, product_id)` → selects correct masterprompt variant
- If no teaching variant exists for the product: fall back to operator voice with a warning to Nick
- Conversation context pills above chat input: current task, mode, time on task, budget used
- Wire budget tracking: every Guide API call → log to `api_usage_log` → check against `user_budgets`

**Day 7: Submission flow**

- "Submit for review" button on task detail
- Multi-step submit flow:
  1. Self-check checklist (all boxes must be checked)
  2. "Run self-check with Guide" — Claude scores against task success criteria
  3. Narrative form (what/why/uncertainties/learnings)
  4. Diff summary (auto-generated from action ledger)
  5. Optional video link
  6. Confirm → creates `submissions` row with `status = 'submitted'`
- Submission confirmation screen

**Phase 2 acceptance tests:**
- [ ] Charlene logs in → sees BFB in Kanban (after Nick grants access)
- [ ] Task detail shows success criteria
- [ ] Moving task to Doing creates an action log entry
- [ ] Guide chat works with apprentice voice (teaching variant)
- [ ] Budget usage visible in context pills
- [ ] Submit flow completes and creates submission row
- [ ] Nick sees submission in operator panel

---

### Phase 3 — Operator review + management (Days 8–10)

**Goal:** Nick can review submissions, manage apprentice access, see cost dashboard.

**Day 8: Review queue**

- `/app/(dashboard)/platform/review/` — submissions awaiting review
- Submission detail view: Charlene's narrative, diff summary, self-check results, action timeline
- Review actions: Approve / Approve with changes / Request changes / Archive with learnings
- On Approve: submission status → `approved`, task status → `approved`
- On Request changes: submission sent back with structured feedback, task back to Doing for apprentice

**Day 9: Apprentice management + project access**

- `/app/(dashboard)/platform/apprentices/[id]/` — per-apprentice view
- Project access toggle: Nick can grant/revoke access per project per apprentice
- Budget management: set/update monthly budget, view usage
- Workspace management: view action ledger, trigger revert, trigger reset to seed

**Day 10: Cost dashboard**

- `/app/(dashboard)/platform/costs/` — platform-wide API spend
- Total spend this month, by user, by feature, by project, by model
- Budget status per user (% of monthly budget used)
- Soft warning thresholds visible

**Phase 3 acceptance tests:**
- [ ] Nick can see and action submissions in review queue
- [ ] Approve → task status changes, Charlene sees "Approved" in her board
- [ ] Request changes → task back to Doing with Nick's feedback visible
- [ ] Nick can toggle BFB access on/off for Charlene
- [ ] Cost dashboard shows per-user breakdown
- [ ] Budget hard cap: Guide chat returns budget-exceeded error when Charlene hits 100%

---

### Phase 4 — Teaching masterprompt + Guide completion (Days 11–12)

**Goal:** Nick can generate and manage teaching variants. Guide is fully wired.

**Day 11: Teaching variant generator**

- `/app/(dashboard)/platform/products/[id]/teaching/` — teaching variant management per product
- "Generate teaching variant" → calls Anthropic API with generator prompt from spec
- Stores result in `teaching_masterprompts` table
- Voice profile editing: per-product fields Nick can edit
- Save voice profile → option to regenerate variant

**Day 12: Auto-regeneration + stuck timer**

- On operator masterprompt update (at `/brief/`): check for active teaching variants, trigger background regeneration
- Nick sees notification when teaching variants updated
- Stuck-timer: Guide tracks elapsed time since last productive action ledger entry
- After 30 minutes: proactively offer stuck-timer escalation modal
- If escalated: creates notification in operator panel with Guide-generated summary

**Phase 4 acceptance tests:**
- [ ] Nick can generate teaching variant for BFB
- [ ] Voice profile editable and saved
- [ ] Teaching variant auto-regenerates when operator masterprompt updates
- [ ] Stuck-timer fires after 30 min stall
- [ ] Stuck-timer escalation appears in Nick's operator panel

---

### Phase 5 — Action ledger + sandbox ops (Days 13–14)

**Goal:** Revert, reset, and time-travel fully operational.

**Day 13: Revert operations**

- Revert single action: restore `before_state` to `target_table.target_id`
- Revert last N actions: in sequence, most recent first
- Mark reverted actions with `reverted_at`
- Only `reversible = true` actions can be reverted
- UI in operator panel → Apprentice → Workspace → Action Ledger

**Day 14: Reset to seed + time-travel view**

- Reset workspace to seed state: revert all non-reverted actions in reverse order
- If any `reversible = false` actions exist: warn before reset, list them
- Time-travel view: render workspace state at any selected timestamp
- Seed state management: operator can update seed state (locks current state as new seed)

**Phase 5 acceptance tests:**
- [ ] Revert single action restores correct state
- [ ] Revert last N works in sequence
- [ ] Reset to seed wipes all apprentice changes
- [ ] Time-travel view shows correct state at selected timestamp
- [ ] Non-reversible actions flagged in UI before reset

---

### Phase 6 — Narrative log + polish (Days 15–16)

**Goal:** Daily narrative log, visual polish on apprentice surface, acceptance test sweep.

**Day 15: Narrative log**

- Cron job: `0 6 * * *` UTC
- Generates: what each user did yesterday, platform-wide API spend, any errors
- Stores in `narrative_logs` table (id, content, generated_at, period_start, period_end)
- Nick sees latest narrative on operator dashboard homepage
- Historical narrative: `/app/(dashboard)/platform/narrative/` — list with search

**Day 16: Polish + acceptance test sweep**

- Visual polish on apprentice surface (match `VISUAL_UI_SPEC_V1.md`)
- Empty states, loading states, error states across all new surfaces
- Run full acceptance test checklist
- Fix any failing tests
- Create PR: `platform-v1` → `main`
- Deploy to preview, smoke test on autonomous-ledger.vercel.app preview URL
- Merge when all acceptance tests pass

---

## Full acceptance test checklist

### Auth and routing
- [ ] Operator logs in → existing dashboard, nothing broken
- [ ] Apprentice logs in → apprentice surface
- [ ] Apprentice cannot access any operator routes
- [ ] Operator cannot accidentally land on apprentice routes

### Project access
- [ ] Apprentice with no access → sees empty instructional state
- [ ] Nick grants access → project appears immediately for apprentice
- [ ] Nick revokes access → project disappears
- [ ] Apprentice cannot see projects not granted

### Kanban and tasks
- [ ] Tasks appear in correct columns
- [ ] Task detail shows all required fields
- [ ] Moving task to Doing logs an action
- [ ] Moving task logs correct before/after state

### Guide
- [ ] Guide chat works in apprentice mode
- [ ] Correct teaching variant used for BFB
- [ ] Budget usage tracked per API call
- [ ] Budget soft warnings fire at 50/80/95%
- [ ] Budget hard cap blocks Guide at 100%
- [ ] Context pills show correct data
- [ ] Stuck-timer fires after 30 min

### Submission flow
- [ ] Submit flow completes end-to-end
- [ ] All self-check boxes required before proceeding
- [ ] Self-check Guide scoring works
- [ ] Submission creates correct database row
- [ ] Nick sees submission in review queue

### Review
- [ ] Approve works, task status updates
- [ ] Charlene sees approved status
- [ ] Request changes sends back with feedback
- [ ] Charlene sees feedback on returned submission

### Action ledger
- [ ] Every sandbox mutation creates an action log entry
- [ ] Revert single action restores state correctly
- [ ] Revert last N works
- [ ] Reset to seed removes all apprentice changes
- [ ] Non-reversible actions flagged

### Costs
- [ ] Every API call logged with cost
- [ ] Cost dashboard shows correct totals
- [ ] Per-user budget visible and accurate

### Teaching masterprompts
- [ ] Generate teaching variant works
- [ ] Voice profile editable
- [ ] Auto-regeneration fires on masterprompt update

### Narrative log
- [ ] Cron generates narrative at 6am UTC
- [ ] Nick sees it on dashboard
- [ ] Historical view accessible

---

## STOP CONDITIONS

Stop and tell Nick if:

1. **A required database table already exists with a conflicting schema** — do not overwrite, report the conflict
2. **The existing masterprompt system (`/brief/`) would need structural changes** to support teaching variants — describe the conflict before modifying
3. **An acceptance test cannot be satisfied without a significant architectural change** not covered in this spec — describe what you found and what would be needed
4. **Any action in the build would modify production data** (not sandbox, not preview) — stop immediately

All other build decisions are yours. Default to: working code over perfect code, operator experience unchanged, apprentice experience per spec, client surface unconstructed but not blocked.

---

**End of Claude Code Handoff.**
