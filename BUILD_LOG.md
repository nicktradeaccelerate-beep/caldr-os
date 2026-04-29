# Build Log — Newton & Sinclair Operating Ledger Platform V1

---

## 2026-04-29 — V1 re-seed + final verification (SETUP_RESULTS.md)

### Re-seed complete

Updated BFB data to final spec following architecture verification and routing fix.

**Changes:**
- BFB project name updated to "BFB (Back From Black)"
- Workspace seed_state: replaced 15 financial distress leads with 15 property/M&A off-market advisory leads
- Email templates: deleted 3 old BFB recovery templates; inserted 3 Mayfair-toned M&A advisory templates (initial/stabilise/rebuild)
- Teaching variant: deactivated old variant (c5121dad-..., BFB financial recovery voice); inserted new Mayfair variant (f85a9a9f-..., generated 2026-04-29T19:58 UTC)

**New teaching variant voice:** Cormorant Garamond / IM Fell English / Courier Prime; obsidian, parchment, antique gold, oxblood; Mayfair not Shoreditch; no exclamation marks; no urgency language; the transaction happens when the principal is ready.

### Verification: 10/10 passed

See `SETUP_RESULTS.md` (2026-04-29 section) for full test results.

**Platform status: READY FOR CHARLENE'S FIRST LOGIN**

---

## 2026-04-29 — Architecture verification + routing fix

### Architecture verification (ARCHITECTURE_VERIFICATION.md)
Ran 10-point architecture check to confirm Platform V1 was built as an integrated extension of the existing Ledger, not a separate deployment.

Result: 9/10 passing. Check 3 (Vercel deployment target) deferred to manual dashboard confirmation by Nick.

---

### Check 9 fix — Apprentice task routing (FIXED)

**Problem:** `app/(apprentice)/tasks/[id]/page.tsx` resolved to URL `/tasks/[id]` due to Next.js route group behaviour (parenthesised groups don't add to the URL). The middleware's `OPERATOR_PREFIXES` included `/tasks`, so apprentices were blocked from their own task detail pages. Dashboard links used `/apprentice/tasks/${id}` which produced 404s.

**Fix applied (Option A):**
- Renamed `app/(apprentice)/tasks/[id]/` → `app/(apprentice)/apprentice-tasks/[id]/`
- New URL: `/apprentice-tasks/[id]`
- Added `/apprentice-tasks` to `APPRENTICE_ONLY` in `middleware.ts`
- Updated task card link in `app/(apprentice)/dashboard/page.tsx`: `/apprentice/tasks/${id}` → `/apprentice-tasks/${id}`
- Updated task link in `app/(apprentice)/products/[id]/page.tsx`: same change
- Fixed broken back-link in task detail page: `/apprentice/dashboard` → `/dashboard`
- Cleared stale `.next/types` cache from old path

**Routing verified (simulated middleware):**
- Apprentice → `/apprentice-tasks/[id]`: ALLOWED ✅
- Operator → `/apprentice-tasks/[id]`: BLOCKED (redirects to /) ✅
- Apprentice → `/tasks` (operator task list): BLOCKED ✅
- Nick's task list at `/tasks`: unaffected ✅

TypeScript: 0 errors.

---

### Check 6 — Teaching variant regeneration trigger (DEFERRED to V1.1)

**Status:** Functional, not blocking.

**What it does now:** Teaching variant regeneration fires as a fire-and-forget call every time an operator loads the Brief page (`/api/ai/brief`). This achieves the spec intent (teaching variants stay current with the operator masterprompt context) but fires on every brief page load, not specifically on masterprompt regeneration.

**What V1.1 should do:** Wire the regeneration trigger directly to the masterprompt regeneration action so it only fires when the masterprompt actually changes.

**Estimated effort:** 30 minutes — identify the masterprompt save/regeneration action, add a hook there, remove the brief-load trigger.

**TODO comment added:** `app/api/ai/brief/route.ts` line 55.

**Why deferred:** Functional as-is. No apprentice impact. Cost difference is minimal at current usage levels. Can ship as enhancement with V1.1 scope.

---

## 2026-04-24 — Platform V1 setup (SETUP_RESULTS.md)

See `SETUP_RESULTS.md` for full detail. Summary:

- Migration 011 confirmed applied (all 10 tables)
- `app/(apprentice)/products/[id]/page.tsx` built
- 3 BFB email templates seeded
- BFB teaching variant generated (claude-haiku-4-5)
- Charlene's account confirmed (charlene@devcor.co.za, role=apprentice, BFB contribute, £50 budget)
- Workspace created with 15 fictional UK leads
- CHARLENE_TASK_001 assigned
- Narrative cron updated to 23:00 UTC, CRON_SECRET added
- Narrative page expanded (today's summary, collapsible history, search)

10/10 verification tests passed.
