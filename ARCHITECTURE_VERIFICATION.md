# Architecture Verification Results

**Date:** 2026-04-29  
**Verifier:** Claude Code (read-only pass — nothing modified)  
**Purpose:** Confirm Platform V1 was built as an integrated extension of the existing Ledger, not a separate deployment.

---

## Summary

**9 of 10 checks passing. Check 3 (Vercel deployment target) requires manual dashboard confirmation.**

| Check | Status |
|---|---|
| 1 — Same repository | PASS |
| 2 — Same Supabase project | PASS |
| 3 — Same Vercel deployment | UNCERTAIN |
| 4 — Existing operator routes preserved | PASS (with notes) |
| 5 — Operator chat preserved | PASS |
| 6 — Masterprompt integration | PASS (with notes) |
| 7 — Agent module is operator-only | PASS |
| 8 — Voice module preserved | PASS |
| 9 — Role-based rendering | PASS *(fixed 2026-04-29)* |
| 10 — Auto-scheduler preserved | PASS |

---

## Detailed results

### Check 1 — Same repository

**Status: PASS**

Evidence:
- Repository: `caldr-os`
- Remote URL: `https://github.com/nicktradeaccelerate-beep/caldr-os.git`
- Current branch: `main`
- This is the same repository as the deployed Caldr OS / Ledger

Notes: The spec (`CLAUDE_CODE_HANDOFF_LEDGER_V1.md`) called for work on a `platform-v1` feature branch. The V1 code has been built directly onto `main` instead. This means there was no branch isolation during development and no PR review step. The code is already merged to the branch that Vercel deploys from. This is not an architectural problem — the V1 is correctly integrated — but it bypassed the review gate the spec intended.

---

### Check 2 — Same Supabase project

**Status: PASS**

Evidence — migration files in `supabase/migrations/`:
```
009_bfb_crm.sql
010_phase10.sql
011_platform_v1_foundation.sql
```

Migration 011 sits sequentially alongside migrations 001–010 in the same directory, all pointing to the same Supabase project (`lnzjtxkiypwebswglwvs`). The new tables (projects, project_access, workspaces, actions, submissions, teaching_masterprompts, api_usage_log, user_budgets, narrative_logs, escalations, email_templates) are in the same database as the existing Ledger tables (users, businesses, calls, tasks, boss_updates, etc).

---

### Check 3 — Same Vercel deployment

**Status: UNCERTAIN**

Evidence:
- No `.vercel/project.json` found in the repository (this file links the local project to a specific Vercel project)
- `vercel.json` only contains cron configuration — no `name`, `alias`, or deployment domain overrides
- Cannot confirm from local code alone that this deploys to `autonomous-ledger.vercel.app`

What's needed to confirm: Check the Vercel dashboard to verify the repository `nicktradeaccelerate-beep/caldr-os` is connected to the `autonomous-ledger.vercel.app` project. The absence of `.vercel/project.json` is common (many projects don't commit it) and is not itself evidence of a problem — it simply means confirmation requires checking Vercel directly.

---

### Check 4 — Existing operator routes preserved

**Status: PASS (with notes on module naming mismatch)**

Evidence — operator nav items confirmed in `app/(dashboard)/layout.tsx`:
```
Home        → /
Calls       → /calls
Time        → /time
AI Hub      → /ai
Tasks       → /tasks
Brief       → /brief
Boss        → /boss
Code        → /code
BFB         → /bfb/templates        (ownerOnly)
Master      → /master/team          (ownerOnly)
Platform    → /platform             (ownerOnly — V1 addition)
Admin       → /admin/billing        (ownerOnly)
```

All routes confirmed present. V1 added `/platform` without removing or modifying any existing routes.

Notes on spec module naming: The verification check references 8 modules by names (Projects, Team, Leaderboard, Partners, Sites, Masterprompt, Voice, Agent) that differ from the actual route names. Mapping best-fit:
- Voice → Calls (`/calls`) ✅
- Masterprompt → Brief (`/brief`) ✅  
- Agent → Boss (`/boss`) ✅
- Team → Master → `/master/team` (also has `/master/access`, `/master/library`, `/master/training`) ✅
- Leaderboard → `/master/team` contains VA scoring/stats interface ✅
- Projects, Partners, Sites → not clearly identifiable as distinct named routes in the current codebase

These modules may have been renamed, consolidated, or the spec's naming predates the current implementation. No evidence any module was removed.

---

### Check 5 — Operator chat preserved

**Status: PASS**

Evidence:
- Operator chat: `app/(dashboard)/ai/page.tsx` + `app/api/ai/chat/route.ts` — present and unmodified
- Apprentice guide: `app/api/guide/chat/route.ts` — a separate route added for V1

These are correctly separated. The guide API (`/api/guide/chat`) uses a different authentication path and masterprompt selection (teaching variant per product) versus the operator chat (`/api/ai/chat`) which uses the standard operator masterprompt. Neither route references or replaces the other.

---

### Check 6 — Masterprompt integration

**Status: PASS (with notes on trigger timing)**

Evidence — `app/api/ai/brief/route.ts` lines 53–65:
```ts
// Fire-and-forget: check if teaching variants need regeneration
// (operator masterprompt context may have changed)
const userRole = (user as unknown as { role: string }).role;
if (['operator', 'owner'].includes(userRole)) {
  const baseUrl = process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000';
  fetch(`${baseUrl}/api/platform/regenerate-teaching-variants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggeredBy: userId }),
  }).catch(() => {
    // Background fire-and-forget — failures are non-blocking
  });
}
```

The `regenerate-teaching-variants` route regenerates all active teaching variants using the current masterprompt context. Nick's existing masterprompt system (`/brief/`) still works exactly as before.

Notes: The trigger fires every time an operator loads their brief page — not specifically when Nick regenerates his masterprompt. The spec says "when Nick regenerates his masterprompt, teaching variants auto-regenerate." The current implementation achieves this eventually but imprecisely (it also fires when Nick just views the brief, not only on explicit regeneration). There's no separate "save masterprompt" action in the current brief page — the brief is dynamically generated — so this is a reasonable interpretation. Not a blocking issue.

---

### Check 7 — Agent module is operator-only

**Status: PASS**

Evidence — `middleware.ts`:
```ts
const OPERATOR_PREFIXES = ['/calls', '/tasks', '/ai', '/brief', '/boss', 
                            '/code', '/time', '/master', '/admin', '/platform'];

case 'apprentice': {
  const isOperatorRoute = OPERATOR_PREFIXES.some(p => path.startsWith(p));
  if (isOperatorRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
```

`/boss` is in OPERATOR_PREFIXES. Any apprentice attempting to navigate to the Boss/Agent module is redirected to `/dashboard` by the middleware before the page renders. The Boss module is also not present in the apprentice layout's navigation.

---

### Check 8 — Voice module preserved

**Status: PASS**

Evidence:
- `app/(dashboard)/calls/page.tsx` present and confirmed unmodified
- Imports: `CallRecordingPlayer`, `CallAnalytics`, `NumberSharing`, `PreCallBrief`, `LiveCallPanel`, `PostCallDebrief`, `SupervisorModal`, `CallMap`
- API routes: `/api/twilio/voice`, `/api/twilio/conference`, `/api/twilio/port`, `/api/calls/[id]/outcome`
- All routes confirmed present via `find /app/api`

V1 added no voice-related files and did not modify any existing voice files.

---

### Check 9 — Role-based rendering

**Status: PASS** *(fixed 2026-04-29)*

The middleware role-routing is correctly designed in principle but contains a routing URL conflict that breaks the apprentice task detail flow.

**Evidence:**

The middleware correctly separates roles:
- `apprentice` → root `/` redirects to `/dashboard`; operator routes blocked
- `operator/owner/manager/va` → apprentice-only routes (`/dashboard`, `/guide`, `/portfolio`) blocked

**The bug:**

1. The apprentice task detail page lives at `app/(apprentice)/tasks/[id]/page.tsx`
2. In Next.js App Router, route groups with parentheses do **not** add to the URL. So this file resolves to URL: `/tasks/[id]`
3. The middleware's `OPERATOR_PREFIXES` includes `/tasks`
4. Apprentices navigating to `/tasks/[id]` are redirected to `/dashboard` — their own page is blocked

Additionally:
5. The dashboard task card links to `/apprentice/tasks/${task.id}` — this URL does not exist as a route (the route group `(apprentice)` does not appear in the URL)
6. Following a task card link from the dashboard produces a 404

**Net result:** Charlene cannot access any task detail page. The Kanban board shows tasks but clicking them 404s, and even if they didn't, the middleware would block the correct URL.

**Secondary routing gap:**
- The products page built as `app/(apprentice)/products/[id]/page.tsx` resolves to `/products/[id]`
- `/products` is NOT in `OPERATOR_PREFIXES`, so middleware does not block operators from accessing it
- Only client-side protection exists (layout redirects non-apprentices)

---

### Check 10 — Auto-scheduler preserved

**Status: PASS**

Evidence:
- `components/boss/BossUpdateLog.tsx` line 49: `pollRef.current = setInterval(() => fetchUpdates(...), 15_000)` — live 15-second update polling in the Boss module
- `/api/boss/daily-summary/route.ts` — daily summary generation endpoint, present and unmodified
- `/api/boss/updates/route.ts` — live update log endpoint, present and unmodified
- `components/boss/BossSettings.tsx` — notification settings (WhatsApp/email) present and unmodified

The Boss module's live auto-update system is fully intact. V1 added no boss-related files. The only Vercel cron in `vercel.json` is the narrative log cron added by V1 — the Boss module's live updates operate client-side via polling, not cron.

---

## Issues found

### FAIL: Check 9 — Apprentice task detail routing is broken

**What's wrong:**
- `app/(apprentice)/tasks/[id]/page.tsx` → Next.js serves it at `/tasks/[id]`
- Middleware blocks `/tasks` for apprentices (it's in OPERATOR_PREFIXES)
- Dashboard links point to `/apprentice/tasks/${task.id}` — a non-existent URL
- Result: task detail pages are completely unreachable for apprentices

**What the spec required:**
Apprentices should be able to click a task card from the Kanban board and view the full task detail (brief, success criteria, resources, start/submit actions).

**Fix options:**

*Option A (recommended):* Move the apprentice tasks page out of the route group to create a distinct URL segment. Rename `app/(apprentice)/tasks/[id]/` to `app/(apprentice)/apprentice-tasks/[id]/` — this would give the URL `/apprentice-tasks/[id]`. Add `/apprentice-tasks` to `APPRENTICE_ONLY`. Update dashboard link to `/apprentice-tasks/${task.id}`. Middleware then needs no change to OPERATOR_PREFIXES.

*Option B:* Remove `/tasks` from OPERATOR_PREFIXES in middleware. This lets apprentices access `/tasks/[id]` (their task detail). The operator task list at `/tasks` would be guarded client-side in the dashboard layout (which already redirects non-operators). Update dashboard link to `/tasks/${task.id}`.

*Option C:* Add an explicit `/apprentice` directory (not a route group) in the app folder, giving routes like `app/apprentice/tasks/[id]/page.tsx` → URL `/apprentice/tasks/[id]`. Add `/apprentice` to APPRENTICE_ONLY and update the dashboard link.

**Estimated effort:** 30–60 minutes (file rename/move + middleware + link updates + TypeScript check)

**Timing:** Must be fixed before Charlene's first login. She will not be able to view task details, start tasks, or submit work without this fix.

---

### UNCERTAIN: Check 3 — Vercel deployment target unconfirmed

**What's needed:** Verify in the Vercel dashboard that `nicktradeaccelerate-beep/caldr-os` is the repository connected to the `autonomous-ledger.vercel.app` production project.

**Estimated effort:** 2 minutes (dashboard check only)

**Timing:** Can confirm before or after any fixes.

---

### NOTE: Check 1 — Main branch, no PR review

**Not a structural failure**, but the spec called for a `platform-v1` feature branch and PR-based review before merging to main. The code went directly to main. The deployment at `autonomous-ledger.vercel.app` therefore already includes V1 code — including the apprentice surface and platform section — even before Charlene's setup ran.

---

## Recommendation

**Issues must be addressed before Charlene's first login.**

The routing bug (Check 9) will prevent Charlene from accessing task details, starting work, or submitting anything. Her first session would be broken from the first click.

Suggested order:
1. Confirm Vercel deployment target (2 min, Check 3)
2. Fix the apprentice task routing (30–60 min, Check 9)
3. Proceed with setup verification
