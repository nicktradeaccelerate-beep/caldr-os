# Build Log — Newton & Sinclair Operating Ledger Platform V1

---

## 2026-04-30 — V1.5.2: BFB Editorial Identity + Apprentice Code Editor

### 1. BFB Editorial Identity — Task Detail View

Task detail page (`app/(apprentice)/apprentice-tasks/[id]/page.tsx`) now renders the full BFB Mayfair editorial identity when `projects.slug === 'bfb'`.

**Typography:**
- Google Fonts loaded conditionally: Cormorant Garamond (headings + section labels), IM Fell English (body/description/paragraph), Courier Prime (monospace)
- Fonts injected via `<link rel="stylesheet">` only when isBfb — no impact on non-BFB tasks

**Palette corrected to spec:**
- Antique gold: `#B8941F` (was `#9A7B3A`)
- Obsidian: `#1A1A1A` (was `#1A1510`)
- Oxblood `#722F37` added — used for medium readiness score (3/5)

**Visual treatment:**
- Headings: Cormorant Garamond, lighter weight (400), generous tracking
- Body text: IM Fell English, 13.5px, 1.85 line height
- Buttons: squared corners (border-radius: 2), uppercase letter-spacing, smaller tracking
- Assessment card: left gold border rule instead of rounded card
- Section labels: "References" not "Resources", "Criteria" not "Success criteria", "Assessment" not "Guide assessment"

**Copy — no exclamation marks, Mayfair register:**
- Backlog CTA: "Read the brief carefully. Review each criterion... Begin"
- Work area: "Your submission" / "Set out your approach..."
- Self-check button: "Request assessment"
- In review: "Submitted. Your submission is with Nick for review."
- Approved: "Approved. All criteria satisfied."

**Dashboard kanban unchanged** — neutral apprentice aesthetic maintained.

---

### 2. Apprentice Code Editor — `/apprentice/code`

**New files:**
- `app/(apprentice)/apprentice/code/page.tsx` — main page (route `/apprentice/code`)
- `components/apprentice/code/FileTree.tsx` — file tree left panel
- `components/apprentice/code/TeachGuideChat.tsx` — guide chat right panel
- `app/api/apprentice/code-assist/route.ts` — Anthropic streaming endpoint
- `hooks/useSandboxFiles.ts` — localStorage file management

**Navigation:** "Code" added to `NAV_ITEMS` in `app/(apprentice)/layout.tsx` (desktop sidebar + mobile tab bar). New icon: `</>` brackets SVG.

**Package added:** `@monaco-editor/react ^4.7.0`

**Architecture:**
- Three-column layout via `ThreeColumnWorkSurface`
- Left (220px): FileTree with add/delete, localStorage persistence per user
- Centre: Monaco editor (dynamic import, Courier Prime font) + optional sandbox preview
- Right (360px): TeachGuideChat streaming chat panel

**Sandbox runtime:**
- `sandbox="allow-scripts allow-modals"` — no `allow-same-origin`, no shell, no Supabase/GitHub/Vercel access
- HTML entry: linked CSS/JS files inlined from sibling sandbox files before srcdoc injection
- React/JSX: Babel standalone + React 18 UMD loaded from unpkg automatically on detection
- CDN whitelist enforced via iframe sandbox (only scripts already in srcdoc execute — no new fetches possible without `allow-same-origin`)
- Key press `Run ▶` triggers new srcdoc generation; each run increments key to force iframe remount

**Claude integration:**
- Streaming via `anthropic.messages.stream()` with SSE response
- Context per request: active file name + content (capped 3000 chars), task title, project name
- Cost logged async to `api_usage_log` with `feature: code_assist_teach` or `code_assist_generate`
- Model: claude-sonnet-4-20250514

**Teach mode (default):**
- System prompt refuses code on first request — asks what apprentice has tried, what their approach is
- Override phrase: "show me the full code" / "write the complete solution"
- Max 5 lines of code per response otherwise
- Visual: warm gold border ring (`rgba(184,148,31,0.25)`) on right panel container
- Mode toggle persists in React state (not localStorage — resets to Teach on page reload)

**Generate mode:**
- Standard code generation, direct
- Visual: neutral border
- Tracked separately in usage logs

**"Apply to file" button:**
- Code blocks in Claude responses include inline "Apply to file" button
- Overwrites active file content in Monaco editor

---

### Option B — Autonomous Claude Code Agent (Deliberately Deferred)

**What it would be:** Server-side process accepting natural-language tasks, shelling out to the `claude` CLI or using Anthropic tool-use/computer-use API in agent mode, executing multi-step code changes autonomously.

**Why deferred:**

1. **Security boundary.** An agent executing shell commands in a shared environment creates unauditable attack surface. Charlene's sandbox must stay isolated.

2. **Cost unpredictability.** Agentic tool-use loops have no natural token ceiling. Without hard per-user cost caps enforced at infrastructure level, this is financially uncontrolled.

3. **Pedagogical harm.** The entire apprentice model requires Charlene to think through problems. An autonomous agent bypasses the Teach mode guardrails and undermines the learning contract.

4. **Vercel/Edge constraint.** Long-running agent loops with stateful tool calls require a persistent process (Railway, Fly, Deno worker) — not available in the current serverless deployment.

**Conditions to revisit:** When Charlene has completed the programme and operates as VA/operator; when a dedicated sandboxed worker environment exists with hard cost caps; when the use case is generation/automation rather than learning.

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
