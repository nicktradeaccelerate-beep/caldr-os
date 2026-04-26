# VISUAL_UI_SPEC_V1.md

**Project:** Newton & Sinclair Operating Ledger — Platform Extension V1
**Scope:** Apprentice-facing UI. Operator UI is unchanged from existing Caldr OS.

---

## 1. Design principles

The apprentice surface is a different rendering of the platform — same backend, entirely different UI philosophy:

- **Operator UI:** dense, efficient, minimal chrome. Built for someone who knows everything.
- **Apprentice UI:** visual, welcoming, educational. Built for someone who is learning while delivering.

Do not compromise the operator surface to achieve the apprentice surface. They are separate. Use `role` to render completely different layouts.

---

## 2. Overall layout — apprentice

```
┌──────────────────────────────────────────────┐
│  CALDR OS  [project switcher]    [user avatar]│  ← Top nav (slim, clean)
├──────────────┬───────────────────────────────┤
│              │                               │
│  Sidebar     │  Main content area            │
│              │                               │
│  - Dashboard │  (changes per section)        │
│  - Tasks     │                               │
│  - Build     │                               │
│  - Guide     │                               │
│  - Portfolio │                               │
│              │                               │
└──────────────┴───────────────────────────────┘
```

Sidebar items shown only for sections relevant to the apprentice's assigned projects.

---

## 3. Component specifications

### 3.1 Kanban project dashboard

Entry point when apprentice logs in. One column per Kanban stage:

```
Backlog | Doing | In Review | Approved | Archived
```

Each task card shows:
- Task title
- Project tag (colour-coded)
- Due date indicator (green/amber/red)
- Submission status badge (if in review)
- Difficulty indicator (1–5 dots)

Card interactions:
- Click to open full task view
- Drag to move between Backlog and Doing only (not into Review — that requires explicit submit)

Stage column headers show task count. "Doing" has a soft cap warning at 3+ tasks.

### 3.2 Live build preview — split pane

Active when a task involves building a UI component or page.

```
┌─────────────────────┬─────────────────────┐
│  CODE               │  PREVIEW            │
│  (read-only view    │  (iframe rendering  │
│  of sandbox state)  │  sandbox build)     │
│                     │                     │
│  File tree left     │  Device toggle:     │
│  Diff highlights    │  Desktop / Mobile   │
│  on changed lines   │                     │
└─────────────────────┴─────────────────────┘
```

Diff highlights: green = added, red = removed (vs. seed state).

### 3.3 Visual diff viewer

On submission and review screens:

- File-by-file accordion
- Each file: side-by-side before/after with syntax highlighting
- Rendered diff (not just code diff) for UI components — show visual before/after
- Action-by-action timeline below code diffs (from action ledger)
- Toggle: "Code view" / "Rendered view"

### 3.4 Diagram-based guide responses

When the Claude Guide responds with structural explanations (architecture, data flow, how a system works), render as Mermaid diagrams inline in the chat.

Trigger: Guide detects explanation is structural → wraps in Mermaid fenced block → frontend renders with `mermaid.js`.

Example guidance types that trigger diagrams:
- "How does the auth flow work?"
- "What happens when I submit?"
- "Show me the data model for this"

Plain prose for conversational replies. Diagrams for structural ones.

### 3.5 Progress visualisation

Visible in the sidebar and on the dashboard header:

- **Sprint progress bar:** tasks completed / total this sprint
- **Skill radar:** 6 axes (build quality, code clarity, delivery speed, guide usage, self-check score, communication). Updates on each approved submission.
- **Submission history:** small sparkline of approved/returned/archived over time

All visualisations are encouraging, not punitive. No red states for the radar. Skill axes only show if there's data.

### 3.6 Personal portfolio gallery

Under `/apprentice/portfolio`:

- Grid of completed and approved work items
- Each card: project, task title, date approved, preview screenshot (auto-captured)
- Click to see submission package + Nick's feedback
- "Share portfolio" generates a read-only link (future feature, placeholder in V1)

### 3.7 Conversation context pills

In the Guide chat interface, above the input:

```
[BFB: Email templates task] [Sandbox mode] [2h 14m on task] [Budget: £12.40 / £50]
```

Always-visible context strip. Apprentice can see exactly what context the Guide has. Clicking a pill explains what it means.

### 3.8 Self-check checklist

Appears when apprentice clicks "Submit for review". Pre-submission screen:

```
☐ Does this meet the success criteria in the task brief?
☐ Have you tested on both desktop and mobile?
☐ Does the code follow the patterns in the existing codebase?
☐ Have you written your narrative (what/why/uncertainties/learnings)?
☐ Is there anything you're unsure about that Nick should know?
```

Bottom: "Run self-check with Guide" — triggers Claude to score against task criteria and highlight specific weaknesses before submission.

Cannot submit until all boxes checked (or explicitly overridden with a reason).

### 3.9 Stuck-timer escalation modal

After 30 minutes of back-and-forth with the Guide without progress (detected by: same questions, Guide offering same suggestions, no action ledger entries):

```
┌──────────────────────────────────────────────┐
│  It looks like you've been stuck for a while │
│                                              │
│  That's completely normal. Want me to         │
│  summarise where we are and flag Nick?       │
│                                              │
│  Nick will see: what you're building, what   │
│  you've tried, where you're stuck.           │
│                                              │
│  [Yes, flag Nick]  [Keep going]  [Dismiss]   │
└──────────────────────────────────────────────┘
```

If "Yes, flag Nick": creates a notification in Nick's operator panel with the Guide-generated summary. Does NOT send an email unless Nick has email notifications on.

### 3.10 Achievement notifications

On approved submissions, unlocked skills, or notable milestones:

- Brief toast notification bottom-right
- Non-intrusive, text-only (no animations that distract during work)
- Logged to portfolio timeline

Examples:
- "First submission approved"
- "3 submissions this month"
- "Self-check score 90%+ three times in a row"

---

## 4. Aesthetic principles

**Typography:** Clean sans-serif (match existing Caldr OS fonts). Guide responses may use slightly larger body text for readability.

**Colour use:** More colour than operator mode, but not playful. Use project accent colours for task cards. Use muted status colours (not traffic-light red) for warnings.

**Spacing:** More breathing room than operator mode. Cards have padding. Sections have clear hierarchy.

**Loading states:** Skeleton screens, not spinners. Show structure before data.

**Empty states:** Instructional, not blank. If no tasks: "Nick hasn't assigned any tasks yet — here's how this will work when he does."

---

## 5. Implementation priority (V1)

**Must ship:**
1. Kanban dashboard (3.1)
2. Task detail view with success criteria
3. Submit flow with self-check checklist (3.8)
4. Visual diff viewer on submission (3.3)
5. Conversation context pills in Guide (3.7)
6. Stuck-timer escalation modal (3.9)

**Ship if time:**
7. Live build preview split pane (3.2)
8. Progress visualisation (3.5)
9. Achievement notifications (3.10)

**V2:**
10. Portfolio gallery (3.6)
11. Diagram-based guide responses (3.4) — Mermaid rendering is low-effort, include if any time left

---

**End of Visual UI Spec V1.**
