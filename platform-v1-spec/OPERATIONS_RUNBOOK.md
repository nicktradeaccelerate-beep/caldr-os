# OPERATIONS_RUNBOOK.md

**Project:** Newton & Sinclair Operating Ledger — Platform Extension V1
**Audience:** Nick Sinclair (operator only)
**Purpose:** Failure recovery reference. What breaks, how to diagnose, how to fix.

---

## 1. Platform structure (quick reference)

| Component | Where | URL |
|---|---|---|
| Frontend | Vercel | autonomous-ledger.vercel.app |
| Database | Supabase | supabase.com/dashboard |
| AI (Claude) | Anthropic API | console.anthropic.com |
| Email | Resend | resend.com |
| Voice | Twilio | twilio.com |

---

## 2. Failure modes and recovery

---

### 2.1 Apprentice can't log in

**Symptom:** Charlene reports she's getting an error on login.

**Diagnose:**
1. Supabase Dashboard → Authentication → Users → find her email
2. Check: is email confirmed? Is account suspended? 
3. Check `users` table → does row exist for her email with `role = 'apprentice'`?

**Fix options:**
- Not confirmed: Supabase → Auth → Users → Resend confirmation email
- No users row: run `INSERT INTO users (id, email, role) VALUES ('[auth.uid]', '[email]', 'apprentice')`
- Account suspended: Supabase → Auth → Users → Unsuspend

**Prevention:** Onboarding flow should auto-create users row on first login via trigger.

---

### 2.2 Apprentice sees nothing (no projects visible)

**Symptom:** Charlene logs in, dashboard shows empty state.

**Diagnose:**
1. Check `project_access` table for her `user_id`
2. Verify: is there a row for BFB project with `access_level IN ('sandbox', 'contribute')`?
3. Check RLS: can she read the row? (Test with Supabase Row Level Security tester)

**Fix:**
In operator panel → Platform → Apprentices → Charlene → Assign project access
OR directly:
```sql
INSERT INTO project_access (user_id, project_id, access_level, granted_by)
VALUES ('[charlene_uid]', '[bfb_project_id]', 'contribute', '[nick_uid]');
```

---

### 2.3 Apprentice workspace is broken / corrupted

**Symptom:** Sandbox state is inconsistent. Charlene's work looks wrong. Something deployed that shouldn't have.

**Diagnose:**
1. Operator panel → Platform → Apprentices → Charlene → BFB Workspace → Action Ledger
2. Find the last action before things went wrong
3. Check `before_state` / `after_state` in the actions table

**Fix options:**
- Revert last N actions: Action ledger → "Revert last N"
- Full reset to seed: Action ledger → "Reset workspace to seed state"
- Time-travel view: Action ledger → pick timestamp → "View state at this point"

**Note:** Revert is only possible for `reversible = true` actions. External API calls and some third-party integrations may not be reversible. These are flagged in the action ledger.

---

### 2.4 Claude Guide is not responding / erroring

**Symptom:** Guide chat shows error or hangs.

**Diagnose:**
1. Check Anthropic console → Usage → is there a spike? Are you near the API limit?
2. Check Vercel logs → `/api/guide/chat` route → what error is returned?
3. Check: has the teaching masterprompt for the product been generated? (`teaching_masterprompts` table, `is_active = true`)

**Fix:**
- Rate limit: wait or increase Anthropic tier
- No active masterprompt: Operator panel → Platform → Products → BFB → Regenerate teaching variant
- Code error: check Vercel function logs for stack trace

---

### 2.5 Submission review queue is empty / submissions not appearing

**Symptom:** Nick expects a submission from Charlene but nothing in review queue.

**Diagnose:**
1. Check `submissions` table for Charlene's `user_id`
2. Check submission `status` — is it `draft` (not submitted yet) or `submitted`?
3. Check: did the submission flow complete? Was the self-check done? All required fields present?

**Fix:**
- If `draft`: check with Charlene — she may not have clicked Submit
- If `submitted` but not showing: check RLS on operator review view, may be filtering incorrectly

---

### 2.6 Anthropic API cost spike

**Symptom:** Platform-wide cost dashboard shows unexpected spend.

**Diagnose:**
1. Cost dashboard → break down by user, feature, project, model
2. Check: is one user in a very long Guide session? (long context = high token count)
3. Check: did the auto-regeneration of teaching variants fire multiple times unexpectedly?
4. Check: is the daily narrative log running more than once per day?

**Fix:**
- Per-user budget enforcement: if a user hits 100% budget, Guide is disabled for them until month reset or Nick raises their budget
- Unexpected cron fires: Vercel → Crons → check schedule
- Masterprompt regeneration loop: check logs for repeated calls to `/api/platform/regenerate-teaching-variant`

**Prevention:** Soft warnings at 50/80/95% per-user. Hard cap at 100%. Nick sees all of this on the cost dashboard in real time.

---

### 2.7 Daily narrative log not appearing

**Symptom:** Nick's morning summary is missing.

**Diagnose:**
1. Vercel → Crons → `daily-narrative` → check last run status
2. Check Vercel function logs for the narrative generation route
3. Check `narrative_logs` table — did a row get created?

**Fix:**
- Cron didn't fire: check Vercel cron schedule (should be `0 6 * * *` UTC — 6am UTC = 7am BST)
- Cron fired but errored: check function logs, likely an Anthropic API error or database write failure
- Manual trigger: `POST /api/platform/narrative/generate` with operator auth header

---

### 2.8 Action ledger is missing entries

**Symptom:** Revert operations fail because actions are missing from ledger.

**Diagnose:**
1. Check `actions` table for the workspace and time period in question
2. Check the action logging middleware — is it being called for the operation type in question?
3. Check: was `reversible = false` set on actions that should have been reversible?

**Fix:**
- Missing logs: this is a code bug — the action type isn't being logged. Fix the middleware to cover the missing operation type.
- Cannot revert: if `reversible = false`, manual SQL recovery may be needed. Use `before_state` / `after_state` in the actions that do exist to reconstruct.

**Prevention:** Every mutation to a sandbox workspace must go through the action logging middleware. New features must register their action types.

---

### 2.9 Vercel deployment failing

**Symptom:** A deploy broke something or the latest code isn't live.

**Diagnose:**
1. Vercel dashboard → Deployments → check last deployment status
2. Check build logs for errors
3. Check: did a `.env` variable get added in code but not in Vercel environment settings?

**Fix:**
- Missing env var: Vercel → Settings → Environment Variables → add missing var → Redeploy
- Build error: fix the code error locally, push
- Rollback: Vercel → Deployments → find last working deployment → "Promote to Production"

---

### 2.10 Supabase Row Level Security blocking a legitimate operation

**Symptom:** A feature works for Nick but not for Charlene (or vice versa), with a permission error in logs.

**Diagnose:**
1. Supabase → SQL Editor → run the query with the affected user's auth context
2. Check RLS policies on the table in question: `SELECT * FROM pg_policies WHERE tablename = '[table]'`
3. Verify: does the policy use `role = 'operator'` vs `role != 'apprentice'` — is it inclusive or exclusive?

**Fix:**
- Policy too restrictive: update to add the missing role to the allowed set
- Policy missing for new table: add appropriate RLS policy in a new migration file
- Test policy: Supabase → Authentication → Policies → Use RLS tester with user token

---

## 3. Escalation paths

| Issue | First step | Escalate to |
|---|---|---|
| Auth broken for apprentice | Supabase dashboard | support@supabase.com |
| Anthropic API down | console.anthropic.com status | status.anthropic.com |
| Vercel deployment broken | Vercel dashboard | vercel.com/support |
| Database data loss | Supabase Point-in-Time Recovery | supabase.com/support |

---

## 4. Useful SQL queries (copy-paste)

**Check apprentice project access:**
```sql
SELECT pa.*, u.email, p.name as project_name
FROM project_access pa
JOIN users u ON u.id = pa.user_id
JOIN projects p ON p.id = pa.project_id
WHERE u.email = '[apprentice_email]';
```

**View last 20 actions in apprentice workspace:**
```sql
SELECT id, action_type, target_table, target_id, reversible, created_at
FROM actions
WHERE user_id = '[apprentice_uid]'
ORDER BY created_at DESC
LIMIT 20;
```

**Check monthly API cost per user:**
```sql
SELECT u.email, SUM(api_cost_gbp) as total_cost_gbp
FROM api_usage_log aul
JOIN users u ON u.id = aul.user_id
WHERE aul.created_at >= date_trunc('month', NOW())
GROUP BY u.email
ORDER BY total_cost_gbp DESC;
```

**Reset apprentice workspace to seed state (manual):**
```sql
-- First: find seed state from actions table
-- Then: restore each table from before_state of earliest action in workspace
-- This is a last resort — use the UI revert function first
```

---

**End of Operations Runbook.**
