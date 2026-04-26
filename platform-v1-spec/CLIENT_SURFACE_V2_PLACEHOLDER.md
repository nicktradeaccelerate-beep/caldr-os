# CLIENT_SURFACE_V2_PLACEHOLDER.md

**Project:** Newton & Sinclair Operating Ledger — Platform Extension V1
**Purpose:** Spec the V2 client surface; document architectural constraints V1 must not violate

---

## 1. What this document is

Client-facing surface is V2. It is not built in V1. This document exists for one reason: V1 must make architectural decisions that don't block V2. Specifically, it identifies the constraints V1 must honour so V2 is additive (new screens, new role, new voice) rather than a rewrite (touching auth, schema, routing).

---

## 2. What the client surface is

Clients are the people Nick is delivering work for. They are not operators. They are not apprentices. They are the end-recipients of the product being built.

In the BFB context: a small business owner or sole trader who has engaged Newton & Sinclair for the Back From Black recovery methodology. They don't see the platform internals. They see their own guided intake journey and their own project area.

**What clients do on the platform:**
- Complete a guided onboarding questionnaire (their business situation, financials, goals)
- Answer follow-up questions as the work progresses
- See progress on their project (limited, curated view — not the full task board)
- Communicate through a structured request form
- Receive deliverables (reports, action plans) through the platform

**What clients never see:**
- Other clients
- Nick's operator view
- Apprentice workspaces
- Cost data
- Internal task boards
- The AI infrastructure

---

## 3. V2 architectural requirements — what V1 must support

### 3.1 Role system must extend to `client`

V1 adds `operator` and `apprentice` to the role system. The role field must be extensible to `client` without schema migration.

**Required:** `role` stored as TEXT (not ENUM). Already the case in existing schema (`users.role TEXT DEFAULT 'va'`). V1 must not change this to an ENUM.

### 3.2 Per-project access must support client scope

The `project_access` table (V1 addition) must include `client_read` and `client_contribute` access levels from day one, even if no code uses them yet.

```sql
access_level: 'read' | 'sandbox' | 'contribute' | 'client_read' | 'client_contribute'
```

`client_read`: client can see their project's status and deliverables, nothing else.
`client_contribute`: client can submit information via guided forms that flows into the project.

### 3.3 RLS policies must not assume only two roles

When writing RLS policies in V1, do not hardcode `role IN ('operator', 'apprentice')`. Write policies that check role explicitly per-table and are addable-to.

Example: instead of `role != 'apprentice'` use `role = 'operator'`.

### 3.4 Claude Guide must support a third voice

The Guide system (V1 adds operator voice + apprentice voice) must be structured so a third voice (`client`) is addable without touching the existing voice routing.

**Required:** Voice selection is a function of `(user.role, product_id)` → returns masterprompt variant. Adding `client` voice = adding a new branch, not modifying the existing logic.

### 3.5 Auth and session must not be apprentice-specific

Session handling, auth redirects, and onboarding flows in V1 must not assume "non-operator = apprentice". The redirect logic should be `switch(role)` not `if(!operator)`.

---

## 4. V2 client surface — what will be built (future reference)

### 4.1 Client onboarding flow

Guided questionnaire, per-product. For BFB: business situation, financials (revenue, expenses, key costs, outstanding debt), goals (stabilise, grow, exit), key decisions pending.

Multi-step form, saved progressively (not lost on refresh). Claude analyses responses in background and pre-populates project context for Nick.

### 4.2 Client project view

Read-only curated view of their project. Shows:
- Current phase of the methodology (not task board — just phase label + description)
- Most recent deliverable (if any)
- What happens next (Nick-written, updated manually)
- A message thread for structured requests ("I need to ask Nick about X")

No real-time updates — refreshes on page load.

### 4.3 Client voice (Claude Guide)

Friendly, plain-language, no jargon. Helps clients complete forms, understand what's being asked, and frame their questions for Nick.

Does NOT have access to Nick's methodology docs. Does NOT discuss project strategy. Limited strictly to: helping with form completion and routing requests to Nick.

### 4.4 Client auth

Separate invite flow. Nick sends invite from operator panel. Client receives email with magic link. Sets password on first login. No SSO required for V2.

---

## 5. What V1 does not build

- Client auth flow
- Client onboarding form
- Client project view
- Client voice masterprompt
- Client notifications
- Any client-facing UI

V1 builds the foundations (role system, access model, guide architecture) such that V2 is a matter of adding screens and a new voice. No schema migrations needed. No routing refactors. No auth rewrites.

---

**End of Client Surface V2 Placeholder.**
