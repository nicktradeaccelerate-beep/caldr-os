You are building V1 of the Newton & Sinclair Operating Ledger Platform Extension — a multi-tenant collaborative platform extending the existing Caldr OS codebase.

The complete specification is in the files alongside this one in `platform-v1-spec/`. Read all of them before writing a single line of code.

Read in this order:
1. LEDGER_PLATFORM_V1.md — master spec, architecture, all three roles
2. CLAUDE_CODE_HANDOFF_LEDGER_V1.md — day-by-day build plan and acceptance tests
3. VISUAL_UI_SPEC_V1.md — apprentice UI requirements
4. TEACHING_VARIANT_MASTERPROMPT_TEMPLATE.md — AI teaching layer
5. CLIENT_SURFACE_V2_PLACEHOLDER.md — architectural constraints you must not violate
6. OPERATIONS_RUNBOOK.md — what Nick will use to recover from failures
7. CHARLENE_ONBOARDING.md — end user experience
8. CHARLENE_TASK_001_email_templates.md — first real task to ship

Also read the existing codebase:
- `/supabase/schema.sql` — full current schema
- `/supabase/migrations/` — all migrations, understand the latest state
- `/app/(dashboard)/` — all operator routes, understand the existing UI
- `/app/(dashboard)/ai/` — existing Claude integration
- `/app/(dashboard)/brief/` — masterprompt system
- `/app/(dashboard)/bfb/` — BFB module
- `/components/` — shared components
- `/app/api/` — all API routes

---

YOUR TASK: Build V1 autonomously and continuously until complete.

Do not stop to ask questions, request approvals, or check in unless one of the explicit STOP CONDITIONS below is hit.

Work through the build phases in CLAUDE_CODE_HANDOFF_LEDGER_V1.md in order. Complete each phase's acceptance tests before moving to the next. When all acceptance tests in the handoff doc pass, the build is complete.

---

STOP CONDITIONS — stop immediately and report to Nick if:

1. A required database table already exists with a conflicting schema that cannot be safely migrated without data loss
2. The existing masterprompt system at `/app/(dashboard)/brief/` would need structural changes not covered in the spec
3. An acceptance test cannot be satisfied without architectural changes not covered in the spec
4. Any action in the build would modify production data (not sandbox, not preview)

All other decisions are yours. Build it.

---

CONSTRAINTS:

- Branch: `platform-v1` (create it, do not touch `main` directly)
- Do not break existing operator UI — the existing dashboard routes must continue to work exactly as before
- Do not violate the V2 architectural constraints in CLIENT_SURFACE_V2_PLACEHOLDER.md
- Migrations go in `/supabase/migrations/` with sequential numbering from the latest existing migration
- Every API call to Anthropic must be logged to `api_usage_log`
- Every mutation in an apprentice sandbox must be logged to `actions`
- Role-based access: `role = 'operator'` in RLS policies (not `role != 'apprentice'`)

---

When the build is complete, report:
- Which acceptance tests pass
- Which (if any) are partial or deferred and why
- Any architectural decisions made that deviated from the spec
- What Nick needs to do to deploy (Vercel env vars, Supabase migration run, etc.)
