-- ============================================================
-- 010 — Phase 10: Offline / Push / Invoices / Milestones / Shifts
-- ============================================================

-- ── Shifts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  break_minutes   INT         NOT NULL DEFAULT 0,
  total_seconds   INT         GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL
         THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INT - break_minutes * 60
         ELSE NULL END
  ) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id, started_at DESC);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_shifts" ON shifts;
CREATE POLICY "own_shifts" ON shifts USING (user_id = auth.uid());

-- ── Invoices ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start    DATE        NOT NULL,
  period_end      DATE        NOT NULL,
  hours_worked    DECIMAL(8,2) NOT NULL,
  hourly_rate     DECIMAL(8,2) NOT NULL,
  tasks_count     INT         NOT NULL DEFAULT 0,
  calls_count     INT         NOT NULL DEFAULT 0,
  efficiency_pct  INT,
  total_amount    DECIMAL(10,2) GENERATED ALWAYS AS (hours_worked * hourly_rate) STORED,
  status          TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid')),
  pdf_url         TEXT,
  sent_at         TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id, period_start DESC);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_invoices" ON invoices;
CREATE POLICY "own_invoices" ON invoices USING (user_id = auth.uid());

-- ── Push subscriptions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint        TEXT        NOT NULL UNIQUE,
  p256dh          TEXT        NOT NULL,
  auth            TEXT        NOT NULL,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_push" ON push_subscriptions;
CREATE POLICY "own_push" ON push_subscriptions USING (user_id = auth.uid());

-- ── User milestones ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_milestones (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type  TEXT        NOT NULL,   -- 'calls_100', 'streak_7', 'hearts_50', 'level_5', etc.
  milestone_value INT,                    -- the threshold reached
  celebrated      BOOLEAN     NOT NULL DEFAULT false,
  achieved_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_user ON user_milestones(user_id, achieved_at DESC);
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_milestones" ON user_milestones;
CREATE POLICY "own_milestones" ON user_milestones USING (user_id = auth.uid());

-- ── Location logs ────────────────────────────────────────────
-- Optional: used if business enables location-based call matching
CREATE TABLE IF NOT EXISTS location_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id     UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lat             DECIMAL(10,7) NOT NULL,
  lng             DECIMAL(10,7) NOT NULL,
  accuracy_m      INT,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_logs_user ON location_logs(user_id, logged_at DESC);
-- Retention: auto-delete logs older than 30 days via pg_cron
-- SELECT cron.schedule('location-log-cleanup', '0 2 * * *',
--   $$DELETE FROM location_logs WHERE logged_at < now() - interval '30 days'$$);

ALTER TABLE location_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_location" ON location_logs;
CREATE POLICY "own_location" ON location_logs USING (user_id = auth.uid());
