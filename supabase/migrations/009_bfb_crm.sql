-- ============================================================
-- 009 — BFB CRM Integration
-- Run on the BFB Supabase project (bfb_jobs, bfb_leads)
-- then on the Caldr OS project (businesses.crm_integration)
-- ============================================================

-- ── BFB Supabase project ────────────────────────────────────

-- 1. Add spatial columns to bfb_jobs
ALTER TABLE bfb_jobs
  ADD COLUMN IF NOT EXISTS lat  DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS lng  DECIMAL(10, 7);

-- 2. Composite index for bounding-box lookups
CREATE INDEX IF NOT EXISTS idx_bfb_jobs_lat_lng
  ON bfb_jobs (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- 3. Read-only RLS for Caldr OS VA role on bfb_jobs
--    Assumes the anon/service key used by Caldr OS has been
--    granted a 'caldr_va' role in the BFB project.
ALTER TABLE bfb_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caldr_va_read_bfb_jobs" ON bfb_jobs;
CREATE POLICY "caldr_va_read_bfb_jobs"
  ON bfb_jobs FOR SELECT
  USING (true);   -- all authenticated caldr reads allowed; tighten per-business if needed

-- 4. Read-only RLS for bfb_leads
ALTER TABLE bfb_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caldr_va_read_bfb_leads" ON bfb_leads;
CREATE POLICY "caldr_va_read_bfb_leads"
  ON bfb_leads FOR SELECT
  USING (true);

-- Allow Caldr OS to update status / notes / last_contact after a call
DROP POLICY IF EXISTS "caldr_va_update_bfb_leads" ON bfb_leads;
CREATE POLICY "caldr_va_update_bfb_leads"
  ON bfb_leads FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ── Caldr OS Supabase project ────────────────────────────────

-- 5. Add CRM integration mode to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS crm_integration TEXT NOT NULL DEFAULT 'none'
    CHECK (crm_integration IN ('none', 'supabase_shared'));

-- Optional: index for fast lookup
CREATE INDEX IF NOT EXISTS idx_businesses_crm
  ON businesses (crm_integration)
  WHERE crm_integration != 'none';
