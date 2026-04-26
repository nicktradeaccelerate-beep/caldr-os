# CHARLENE_TASK_001_email_templates.md

**Task:** BFB Email Template Editor
**Project:** Back From Black
**Assigned to:** Charlene van der Westhuizen
**Stage:** Backlog

---

## What you're building

A template editor in the BFB module that lets Nick create, edit, and send structured email templates to BFB clients.

BFB clients are small business owners and sole traders in financial distress or recovery. The emails they receive need to be:
- Direct and specific (not corporate boilerplate)
- Actionable (every email should have a clear next step)
- Timed correctly (different templates for different stages of the recovery process)

The editor is an internal tool for Nick, not a client-facing feature.

---

## Success criteria

Your submission is approved when:

1. **Template list view** — Nick can see all existing templates in a table with: template name, trigger stage, last edited date, preview button.

2. **Create/edit template** — A form that lets Nick write and edit template content with:
   - Template name
   - Subject line
   - Body (rich text — bold, italics, bullet lists, links. No more than that.)
   - Trigger stage selector (which phase of BFB recovery sends this: Initial, Stabilise, Rebuild, Graduate)
   - Variable placeholders — `{{client_name}}`, `{{business_name}}`, `{{next_action}}` — with a visible legend showing available variables
   - Preview mode — renders the template with dummy data replacing the variables

3. **Send test email** — Nick can send himself a preview email from within the editor.

4. **Save draft / publish** — Templates have draft and published states. Only published templates can be triggered by the system.

5. **No data loss** — If Nick is mid-edit and navigates away accidentally, the draft autosaves.

6. **Mobile-usable** — The list view and read view work on mobile. The editor itself can be desktop-only (acceptable).

---

## What good looks like

The templates Nick writes are short, specific, and direct. The editor should not get in the way of that. No bloated toolbars. No WYSIWYG editors that feel like Microsoft Word.

Think: a clean writing environment that happens to support a few formatting options and variable insertion.

---

## Technical context

- This lives in the BFB module at `/app/(dashboard)/bfb/`
- Look at how other BFB routes are structured before adding new ones
- Email delivery uses the existing Resend integration — don't add a new email provider
- The `variables` in templates are client-level data — they map to fields in the `businesses` and `users` tables
- Supabase migration needed: new `email_templates` table. Design the schema before writing it.

---

## Suggested schema

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  trigger_stage TEXT NOT NULL CHECK (trigger_stage IN ('initial', 'stabilise', 'rebuild', 'graduate')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

This is a starting point. If you see a reason to change it, do — but document why in your submission narrative.

---

## What to submit

1. Working feature that meets all success criteria above
2. Migration file for the `email_templates` table
3. Your narrative: what you built, the choices you made, what you'd do differently, what you learned about the BFB product while building this
4. Self-check results (run the Guide's pre-submission check before submitting)

---

## What happens when it's approved

This ships. Nick's going to use it. BFB clients will receive emails built with templates you created. That's the bar.

---

**Good luck. Ask the Guide anything. If you're stuck for 30 minutes, let it flag Nick.**
