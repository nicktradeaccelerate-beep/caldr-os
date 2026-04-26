-- ═══════════════════════════════════════════════════════
-- CALDR OS — Supabase Schema
-- Run in Supabase SQL editor in order
-- ═══════════════════════════════════════════════════════

-- ── BUSINESSES (white-label tenants) ─────────────────────────────
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  accent_color TEXT DEFAULT '#1B4332',
  logo_url TEXT,
  knowledge TEXT,
  objections JSONB DEFAULT '{}',
  plan TEXT DEFAULT 'professional',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  notify_whatsapp BOOLEAN DEFAULT FALSE,
  notify_email BOOLEAN DEFAULT FALSE,
  whatsapp_number TEXT,
  owner_whatsapp TEXT,
  owner_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── USERS ────────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  business_id UUID REFERENCES businesses(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'va',
  uk_number TEXT,
  twilio_sip_username TEXT,
  twilio_sip_password TEXT,
  port_status TEXT DEFAULT 'new',
  pac_code TEXT,
  status TEXT DEFAULT 'offline',
  hearts_total INT DEFAULT 0,
  level INT DEFAULT 0,
  streak INT DEFAULT 0,
  ai_usage JSONB DEFAULT '{"claude":0,"gpt":0,"gemini":0}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── NUMBERS ──────────────────────────────────────────────────────
CREATE TABLE numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  number TEXT NOT NULL UNIQUE,
  twilio_sid TEXT NOT NULL,
  type TEXT DEFAULT 'mobile',
  features JSONB DEFAULT '{"recording":true,"transcription":true,"voicemail":true}',
  whatsapp_verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CALLS ────────────────────────────────────────────────────────
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  va_id UUID REFERENCES users(id),
  twilio_call_sid TEXT UNIQUE,
  contact_name TEXT,
  contact_number TEXT NOT NULL,
  direction TEXT NOT NULL,
  area TEXT,
  duration_seconds INT DEFAULT 0,
  sentiment_score INT,
  intent_signal TEXT,
  ai_score INT,
  flags TEXT[] DEFAULT '{}',
  recording_url TEXT,
  transcript TEXT,
  coaching_note TEXT,
  outcome TEXT,
  channel TEXT DEFAULT 'phone',
  status TEXT DEFAULT 'completed',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ── TASKS ────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  text TEXT NOT NULL,
  category TEXT DEFAULT 'admin',
  hearts INT DEFAULT 1,
  estimate_mins INT DEFAULT 10,
  elapsed_seconds INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  due_date DATE DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── BOSS UPDATES LOG ──────────────────────────────────────────────
CREATE TABLE boss_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  va_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id),
  call_id UUID REFERENCES calls(id),
  sent_whatsapp BOOLEAN DEFAULT FALSE,
  sent_email BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── WHATSAPP MESSAGES ─────────────────────────────────────────────
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  va_id UUID REFERENCES users(id),
  contact_number TEXT NOT NULL,
  contact_name TEXT,
  message TEXT NOT NULL,
  direction TEXT DEFAULT 'inbound',
  lead_score INT,
  ai_response TEXT,
  status TEXT DEFAULT 'unread',
  bfb_pipeline_added BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── QR PROVISION TOKENS ───────────────────────────────────────────
CREATE TABLE provision_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────────
CREATE INDEX idx_calls_va_id ON calls(va_id);
CREATE INDEX idx_calls_business_id ON calls(business_id);
CREATE INDEX idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX idx_tasks_user_date ON tasks(user_id, due_date);
CREATE INDEX idx_boss_updates_business ON boss_updates(business_id, created_at DESC);
CREATE INDEX idx_whatsapp_business ON whatsapp_messages(business_id, created_at DESC);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────
ALTER TABLE businesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE numbers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE boss_updates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provision_tokens ENABLE ROW LEVEL SECURITY;

-- Helper function: get caller's business_id
CREATE OR REPLACE FUNCTION current_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies
CREATE POLICY "users_own_business" ON users
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "businesses_own" ON businesses
  FOR ALL USING (id = current_business_id());

CREATE POLICY "numbers_own_business" ON numbers
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "calls_own_business" ON calls
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "tasks_own_user" ON tasks
  FOR ALL USING (
    user_id = auth.uid() OR
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid() AND role IN ('owner','manager')
    )
  );

CREATE POLICY "boss_updates_own_business" ON boss_updates
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "whatsapp_own_business" ON whatsapp_messages
  FOR ALL USING (business_id = current_business_id());

CREATE POLICY "provision_tokens_own_business" ON provision_tokens
  FOR ALL USING (business_id = current_business_id());
