-- ============================================================
-- 011 — Platform V1 Foundation
-- Newton & Sinclair Operating Ledger Extension
-- ============================================================

-- ── Create all tables first ───────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  module_type   TEXT        NOT NULL DEFAULT 'bfb',
  description   TEXT,
  created_by    UUID        REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_access (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  access_level  TEXT        NOT NULL CHECK (
    access_level IN ('read', 'sandbox', 'contribute', 'client_read', 'client_contribute')
  ),
  granted_by    UUID        REFERENCES users(id),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT,
  UNIQUE (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  seed_version  TEXT        NOT NULL DEFAULT 'v1',
  seed_state    JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reset_at      TIMESTAMPTZ,
  UNIQUE (user_id, project_id)
);

CREATE TABLE IF NOT EXISTS actions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID        REFERENCES projects(id),
  workspace_id  UUID        REFERENCES workspaces(id),
  action_type   TEXT        NOT NULL,
  target_table  TEXT,
  target_id     UUID,
  before_state  JSONB,
  after_state   JSONB,
  actor_role    TEXT        NOT NULL CHECK (actor_role IN ('operator', 'apprentice', 'client')),
  reversible    BOOLEAN     NOT NULL DEFAULT true,
  reverted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id          UUID        NOT NULL REFERENCES projects(id),
  workspace_id        UUID        REFERENCES workspaces(id),
  task_id             UUID        REFERENCES tasks(id),
  status              TEXT        NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'in_review', 'approved', 'changes_requested', 'archived')
  ),
  diff_summary        JSONB       DEFAULT '{}',
  narrative           TEXT,
  self_check_results  JSONB       DEFAULT '{}',
  video_link          TEXT,
  review_outcome      TEXT,
  review_notes        TEXT,
  reviewed_by         UUID        REFERENCES users(id),
  submitted_at        TIMESTAMPTZ,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teaching_masterprompts (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                TEXT        NOT NULL,
  base_masterprompt_version TEXT        NOT NULL DEFAULT 'v1',
  content                   JSONB       NOT NULL DEFAULT '{}',
  voice_profile             JSONB       NOT NULL DEFAULT '{}',
  status                    TEXT        NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'pending_review', 'inactive')
  ),
  generated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by              UUID        REFERENCES users(id),
  is_active                 BOOLEAN     NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS api_usage_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID        REFERENCES projects(id),
  feature       TEXT        NOT NULL,
  model         TEXT        NOT NULL,
  tokens_in     INT         NOT NULL DEFAULT 0,
  tokens_out    INT         NOT NULL DEFAULT 0,
  api_cost_gbp  DECIMAL(10,6) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_budgets (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  monthly_budget_gbp  DECIMAL(8,2) NOT NULL DEFAULT 50.00,
  soft_warn_pct       INT         NOT NULL DEFAULT 80,
  hard_cap_pct        INT         NOT NULL DEFAULT 100,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS narrative_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content       TEXT        NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS escalations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID        REFERENCES projects(id),
  workspace_id  UUID        REFERENCES workspaces(id),
  summary       TEXT        NOT NULL,
  guide_context TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'seen', 'resolved')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  subject       TEXT        NOT NULL,
  body_html     TEXT        NOT NULL DEFAULT '',
  trigger_stage TEXT        NOT NULL CHECK (
    trigger_stage IN ('initial', 'stabilise', 'rebuild', 'graduate')
  ),
  status        TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  project_id    UUID        REFERENCES projects(id),
  created_by    UUID        REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Extend tasks table ────────────────────────────────────────

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS success_criteria TEXT[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS difficulty INT DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kanban_status TEXT DEFAULT 'backlog' CHECK (
  kanban_status IN ('backlog', 'doing', 'in_review', 'approved', 'archived')
);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_actions_workspace ON actions(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_user ON actions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teaching_mp_product ON teaching_masterprompts(product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_usage_user ON api_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_month ON api_usage_log(created_at DESC);

-- ── Enable RLS on all new tables ──────────────────────────────

ALTER TABLE projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_access        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces            ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE teaching_masterprompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_budgets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates       ENABLE ROW LEVEL SECURITY;

-- ── Policies (all tables exist by this point) ─────────────────

CREATE POLICY "projects_operator_full" ON projects
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "projects_apprentice_read_assigned" ON projects
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
    AND id IN (
      SELECT project_id FROM project_access
      WHERE user_id = auth.uid()
        AND access_level IN ('read', 'sandbox', 'contribute')
    )
  );

CREATE POLICY "project_access_operator_full" ON project_access
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "project_access_apprentice_own" ON project_access
  FOR SELECT USING (
    user_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
  );

CREATE POLICY "workspaces_operator_full" ON workspaces
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "workspaces_apprentice_own" ON workspaces
  FOR ALL USING (
    user_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
  );

CREATE POLICY "actions_operator_full" ON actions
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "actions_apprentice_own" ON actions
  FOR ALL USING (
    user_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
  );

CREATE POLICY "submissions_operator_full" ON submissions
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "submissions_apprentice_own" ON submissions
  FOR ALL USING (
    user_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
  );

CREATE POLICY "teaching_mp_operator_full" ON teaching_masterprompts
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "teaching_mp_apprentice_read_active" ON teaching_masterprompts
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
    AND is_active = true
  );

CREATE POLICY "api_usage_operator_full" ON api_usage_log
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "api_usage_apprentice_own" ON api_usage_log
  FOR SELECT USING (
    user_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
  );

CREATE POLICY "user_budgets_operator_full" ON user_budgets
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "user_budgets_apprentice_own_read" ON user_budgets
  FOR SELECT USING (
    user_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
  );

CREATE POLICY "narrative_logs_operator_full" ON narrative_logs
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );

CREATE POLICY "escalations_operator_full" ON escalations
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "escalations_apprentice_own" ON escalations
  FOR ALL USING (
    user_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
  );

CREATE POLICY "email_templates_operator_full" ON email_templates
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) IN ('operator', 'owner', 'manager')
  );
CREATE POLICY "email_templates_apprentice_sandbox" ON email_templates
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1) = 'apprentice'
    AND project_id IN (
      SELECT project_id FROM project_access
      WHERE user_id = auth.uid()
        AND access_level IN ('sandbox', 'contribute')
    )
  );

-- ── Seed: BFB project ─────────────────────────────────────────

INSERT INTO projects (name, slug, module_type, description)
VALUES (
  'Back From Black',
  'bfb',
  'bfb',
  'Structured recovery methodology for small businesses and sole traders in financial distress or recovery.'
)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed: Charlene Task 001 ───────────────────────────────────

INSERT INTO tasks (
  text, title, description, category, status, kanban_status,
  project_id, difficulty, success_criteria, resources,
  hearts, estimate_mins, due_date
)
SELECT
  'BFB Email Template Editor',
  'BFB Email Template Editor',
  'Build a template editor in the BFB module that lets Nick create, edit, and send structured email templates to BFB clients.',
  'admin',
  'pending',
  'backlog',
  p.id,
  3,
  ARRAY[
    'Template list view with name, trigger stage, last edited date, preview button',
    'Create/edit template form with name, subject, body, trigger stage, variable placeholders',
    'Preview mode with dummy data replacing variables',
    'Send test email button',
    'Save draft / publish states',
    'No data loss — autosave on draft',
    'Mobile-usable list and read views'
  ],
  '[{"label":"Task brief","url":"/platform/tasks/001"}]'::jsonb,
  2,
  90,
  CURRENT_DATE + INTERVAL '7 days'
FROM projects p
WHERE p.slug = 'bfb'
ON CONFLICT DO NOTHING;
