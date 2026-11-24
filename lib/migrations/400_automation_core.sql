CREATE TABLE IF NOT EXISTS automation_rules (
 id SERIAL PRIMARY KEY,
 name TEXT NOT NULL,
 trigger_type TEXT NOT NULL,
 condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
 action_json JSONB NOT NULL DEFAULT '{}'::jsonb,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TEXT NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_logs (
 id BIGSERIAL PRIMARY KEY,
 rule_id INTEGER,
 event_type TEXT NOT NULL,
 payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
 status TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_event
ON automation_logs(event_type, created_at DESC);
