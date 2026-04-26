CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_boss_on_task_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  va_name TEXT;
  business_url TEXT;
BEGIN
  IF OLD.status = NEW.status OR NEW.status <> 'done' THEN
    RETURN NEW;
  END IF;
  SELECT name INTO va_name FROM users WHERE id = NEW.user_id;
  business_url := current_setting('app.next_public_url', TRUE);
  IF business_url IS NULL OR business_url = '' THEN
    business_url := 'https://os.caldr.ai';
  END IF;
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
