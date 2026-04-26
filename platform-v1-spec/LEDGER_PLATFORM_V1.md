# LEDGER_PLATFORM_V1.md

**Project:** Newton & Sinclair Operating Ledger — Platform Extension V1
**Host application:** Caldr OS (this repository) at autonomous-ledger.vercel.app
**Built by:** Claude Code (autonomous build)
**Owner:** Nick Sinclair
**First apprentice:** Charlene van der Westhuizen
**First product module:** BFB (Back From Black)

---

## 1. Purpose

Caldr OS is currently a single-user operating system for Newton & Sinclair Ltd. This V1 extends it into a **multi-tenant collaborative platform** with three distinct user types:

1. **Operator (Nick)** — full access, all projects, agent control, complete operational authority
2. **Apprentices (Charlene, future hires)** — sandboxed work on assigned projects, taught in Nick's style by the Claude guide, can build features and finish projects under review
3. **Clients (future, V2)** — login to their own area, answer guided questions, provide details that complete the work Nick is delivering for them

V1 builds the operator + apprentice experience. Client-facing surface is V2 but the architecture supports it without rework.

---

## 2. Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│                  CALDR OS — PLATFORM EXTENSION               │
│  (existing Next.js 14 + Supabase + Vercel + Anthropic stack)│
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │OPERATOR │         │APPRENT. │         │ CLIENT  │
   │  (Nick) │         │(Charlene│         │  (V2)   │
   │         │         │  +)     │         │         │
   │ Full UI │         │ Taught  │         │ Guided  │
   │ Agent   │         │ Visual  │         │ Intake  │
   │ All     │         │ Sandbox │         │ Forms   │
   │ projects│         │ Per-proj│         │ Their   │
   │         │         │ access  │         │ project │
   └─────────┘         └─────────┘         └─────────┘
        │                   │                   │
        └─────────┬─────────┴─────────┬─────────┘
                  ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  PROJECT MODULES │  │   SHARED CORE    │
        │                  │  │                  │
        │  V1: BFB         │  │ - Auth/Roles     │
        │  V2: Caldr SME   │  │ - Action Ledger  │
        │  V3: Caldr Tax   │  │ - Claude Guide   │
        │  V3: Property    │  │ - Masterprompt   │
        │       Mgmt       │  │ - Sandbox engine │
        └──────────────────┘  │ - Cost tracking  │
                              │ - Visual UI lib  │
                              └──────────────────┘
```

---

## 3. The three user roles

### 3.1 Operator (Nick)

**What changes vs current Caldr OS:** Almost nothing. Existing UI and all modules preserved. Adds:
- Apprentice management panel (assign projects, set budgets, review submissions)
- Client management panel (V2 placeholder)
- Platform-wide cost dashboard (Anthropic API spend across all users)
- Narrative activity log (Claude-generated daily summary of what users did)

**Visual style:** Keep current operator-dense aesthetic. Don't lose what works.

### 3.2 Apprentice (Charlene)

**What they see:** A different rendering of the platform entirely. Same backend, different UI.

**Default visibility:** Nothing. Apprentices see nothing until Nick toggles individual projects on for them.

**When a project is toggled on:** They see that project as a sandboxed working copy with seeded data. They can:
- Read the project context
- See assigned tasks for that project
- Use the Claude guide (in teaching variant of Nick's voice for that project)
- Build/edit within the sandbox
- Submit work for review

**What they never see:** Nick's live operator data, agent module, projects not toggled on for them, other apprentices' workspaces, client data.

**Visual style:** Visually richer than operator mode. Kanban dashboards, live build previews, visual diff views, diagram-based explanations from the guide, progress visualisations. Designed for learning + delivery, not pure operational efficiency.

### 3.3 Client (V2 placeholder — design now, build later)

**Why design now:** Same multi-tenant infrastructure. Decisions made in V1 must not block client surface in V2. Specifically: roles must extend beyond `operator/apprentice` to include `client`; project access must support client-scope; Claude guide must support an additional voice.

V1 builds the foundations correctly so V2 is additive, not a rewrite.

---

## 4. Per-project access model

Apprentices get nothing by default. Nick explicitly grants per-project access.

**Schema:**

```sql
project_access:
  - id
  - user_id
  - project_id
  - access_level: 'read' | 'sandbox' | 'contribute' | 'client_read' | 'client_contribute'
  - granted_by (user_id)
  - granted_at
  - notes
```

**Access levels:**
- **Read** — can see project context and master doc, cannot work on it
- **Sandbox** — full working copy with seeded data, no production impact
- **Contribute** — sandbox PLUS can submit work to review queue for promotion to live project

**Charlene's V1 starting access:** BFB: Contribute. Everything else: nothing.

---

## 5. The Claude Guide — three voices, three modes

The existing Caldr OS already has Claude integration (AI chat at `/app/(dashboard)/ai/`, Masterprompt at `/app/(dashboard)/brief/`). V1 extends this with:

### 5.1 Three voices

**Operator voice** — the existing Caldr OS chat. Direct, concise, peer-to-peer, full access to masterprompt.

**Apprentice voice (per product)** — teaches in Nick's voice for the specific product. Each product has its own teaching-variant masterprompt.

**Client voice (V2)** — friendly, plain-language, explains without jargon.

### 5.2 Two apprentice modes

**Work mode** — scoped to current task, grounded in product methodology, output flows to review queue.

**Personal mode** — open building space for apprentice's own tools/sites/experiments. Nothing touches Nick's projects.

### 5.3 Pre-submission self-check

Before submitting, the guide scores work against task success criteria and flags weaknesses. Reduces wasted review cycles.

### 5.4 Stuck-timer escalation

After 30 minutes of going in circles, the guide proactively offers to escalate to Nick with a summary.

---

## 6. The teaching-variant Masterprompt

The existing Caldr OS masterprompt (at `/app/(dashboard)/brief/`) is extended with a teaching-variant generator per product. See `TEACHING_VARIANT_MASTERPROMPT_TEMPLATE.md` for full spec.

**Versioning:** When Nick regenerates his masterprompt, teaching variants auto-regenerate.

**Per-product voice profiles:** Each product has its own voice profile Nick can edit directly.

---

## 7. Sandboxing and reversibility

**Action ledger:** Every apprentice action logs as a reversible transaction:

```sql
actions:
  - id, user_id, project_id, workspace_id, action_type
  - target_table, target_id
  - before_state, after_state (jsonb)
  - actor_role: 'operator' | 'apprentice' | 'client'
  - reversible: boolean
  - reverted_at: timestamp nullable
  - created_at
```

**Operations:** Revert single action, revert last N, reset workspace to seed state, time-travel view.

---

## 8. Submission and review flow

### 8.1 Submission package

- Diff (file by file, action by action)
- Claude-generated summary
- Charlene's structured narrative (what built / why / uncertainties / learnings)
- Optional Loom video link
- Self-check results

### 8.2 Review outcomes

- **Approved** — promoted to live project
- **Approved with changes** — Nick edits in review, accepts. Apprentice sees what changed.
- **Request changes** — sent back with structured feedback
- **Archive with learnings** — preserved with Nick's notes; apprentice can fork to personal sandbox

### 8.3 Async-friendly cadence

Review SLA: 48 hours. Hua Hin / SA time difference managed via async.

---

## 9. Visual UI specification (apprentice surface)

See `VISUAL_UI_SPEC_V1.md` for full detail. Key patterns:

- Kanban project dashboard
- Live build preview (split pane)
- Visual diff viewer (code + rendered views)
- Diagram-based guide responses (Mermaid)
- Progress and achievement visualisations
- Personal portfolio gallery
- Conversation context pills
- Self-check checklist
- Stuck-timer escalation modal
- Achievement notifications

---

## 10. Cost monitoring

### 10.1 Per-user budgets

Each user has a monthly Anthropic API budget. Charlene starts at £50/month. Hard cap at 100%, soft warnings at 50/80/95%.

### 10.2 Platform-wide spend dashboard

Nick sees total Anthropic API spend across the platform, broken down by user, feature, project, and mode.

### 10.3 Cost attribution

Every API call logs: who triggered it, which project, which feature, tokens in/out, cost in GBP, model used.

---

## 11. The narrative activity log

Plain-English daily summary generated by Claude overnight. Covers what each user did, platform-wide Anthropic spend, any errors. Nick reads it each morning.

---

## 12. Failure recovery — the operations runbook

Embedded in the platform, Nick-only, searchable. See `OPERATIONS_RUNBOOK.md` for content.

---

## 13. The "Charlene doesn't work out" off-ramp

- Apprentice accounts are role-based, not name-based
- Workspace data preserved 30 days on suspension then archived
- Tasks assigned to "the BFB apprentice" role, not a specific person
- Multiple apprentices supported from day 1

---

## 14. Build phasing (V1 scope discipline)

**V1 (current):** BFB product module + Charlene onboarded
**V2 (Jun-Jul 2026):** Caldr SME module
**V3 (Aug-Sep 2026):** Caldr Tax + Property Management
**V4 (Oct-Dec 2026):** Client-facing surface

---

## 15. Architectural decisions excluded from V1

- Multi-organisation support
- SSO beyond existing Caldr auth
- Mobile apps
- Offline mode
- Real-time collaboration
- Client-facing surface (V2)
- Public marketplace

---

## 16. Success metrics

**For Charlene:** First approved submission within 7 days. 3+ approved in first month. Stuck-timer escalations trending down.

**For Nick:** Review time per submission < 15 minutes. Total review < 2 hours/week. Anthropic spend predictable within 20% of forecast. Zero production data incidents.

**For the platform:** 99%+ uptime. Action ledger 100% reversible. Per-user budget enforcement 100%.

---

**End of master spec.**
