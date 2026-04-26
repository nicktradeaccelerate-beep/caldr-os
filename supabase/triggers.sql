-- ═══════════════════════════════════════════════════════
-- CALDR OS — Supabase Triggers & Functions
-- Run after schema.sql in the Supabase SQL editor
-- ═══════════════════════════════════════════════════════

-- ── pg_net extension (needed for HTTP calls from triggers) ─────────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── AUTO BOSS NOTIFY on task status → 'done' ──────────────────────
-- Fires an HTTP POST to /api/boss/notify whenever a task is marked complete

CREATE OR REPLACE FUNCTION notify_boss_on_task_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  va_name TEXT;
  business_url TEXT;
BEGIN
  -- Only fire when status transitions to 'done'
  IF OLD.status = NEW.status OR NEW.status <> 'done' THEN
    RETURN NEW;
  END IF;

  -- Get VA name
  SELECT name INTO va_name FROM users WHERE id = NEW.user_id;

  -- App URL — set as Supabase secret: supabase secrets set NEXT_PUBLIC_URL=https://os.caldr.ai
  business_url := current_setting('app.next_public_url', TRUE);
  IF business_url IS NULL OR business_url = '' THEN
    business_url := 'https://os.caldr.ai';
  END IF;

  -- Fire HTTP call — non-blocking (pg_net queues the request)
  PERFORM net.http_post(
    url := business_url || '/api/boss/notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := json_build_object(
      'type', 'task_complete',
      'businessId', NEW.business_id,
      'payload', json_build_object(
        'vaId', NEW.user_id,
        'vaName', COALESCE(va_name, 'VA'),
        'taskId', NEW.id,
        'taskText', NEW.text,
        'duration', CONCAT(ROUND(NEW.elapsed_seconds / 60.0), 'm'),
        'hearts', NEW.hearts::text
      )
    )::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS boss_notify_task_complete ON tasks;
CREATE TRIGGER boss_notify_task_complete
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_boss_on_task_complete();

-- ── AUTO BOSS NOTIFY on task status → 'active' (started) ──────────
CREATE OR REPLACE FUNCTION notify_boss_on_task_start()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  va_name TEXT;
  business_url TEXT;
BEGIN
  IF OLD.status = NEW.status OR NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO va_name FROM users WHERE id = NEW.user_id;
  business_url := COALESCE(current_setting('app.next_public_url', TRUE), 'https://os.caldr.ai');

  PERFORM net.http_post(
    url := business_url || '/api/boss/notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := json_build_object(
      'type', 'task_start',
      'businessId', NEW.business_id,
      'payload', json_build_object(
        'vaId', NEW.user_id,
        'vaName', COALESCE(va_name, 'VA'),
        'taskId', NEW.id,
        'taskText', NEW.text
      )
    )::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS boss_notify_task_start ON tasks;
CREATE TRIGGER boss_notify_task_start
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_boss_on_task_start();

-- ── HEART DECAY — daily cron via pg_cron ──────────────────────────
-- Requires: CREATE EXTENSION IF NOT EXISTS pg_cron; (enabled in Supabase dashboard)
-- Schedule: runs at 23:55 every day

SELECT cron.schedule(
  'heart-decay-daily',
  '55 23 * * *',
  $$
    UPDATE users
    SET hearts_total = GREATEST(0, hearts_total - 1)
    WHERE status = 'offline'
      AND updated_at < NOW() - INTERVAL '24 hours';
  $$
);

-- ── AI USAGE RESET — midnight UTC cron ───────────────────────────
-- Resets ai_usage JSONB on all users at 00:00 UTC every day
SELECT cron.schedule(
  'ai-usage-reset-midnight',
  '0 0 * * *',
  $$
    UPDATE users SET ai_usage = '{"claude":0,"gpt":0,"gemini":0}'::jsonb;
  $$
);

-- ── BIRTHDAY DETECTION — daily cron ───────────────────────────────
-- Compares family member birthdays to today, fires a boss_updates row
SELECT cron.schedule(
  'birthday-check-daily',
  '0 8 * * *',
  $$
    INSERT INTO boss_updates (business_id, va_id, type, message, task_id, call_id)
    SELECT
      u.business_id,
      u.id,
      'task_complete',
      '🎂 Birthday today: ' || (f->>'name') || ' turns ' ||
        (DATE_PART('year', NOW()) - DATE_PART('year', (f->>'dob')::date))::int::text,
      NULL,
      NULL
    FROM users u,
         jsonb_array_elements(COALESCE(u.family, '[]'::jsonb)) AS f
    WHERE
      TO_CHAR((f->>'dob')::date, 'MM-DD') = TO_CHAR(NOW(), 'MM-DD');
  $$
);
