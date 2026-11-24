CREATE TABLE IF NOT EXISTS automation_events (
 id SERIAL PRIMARY KEY,
 event_type VARCHAR(100) NOT NULL,
 source VARCHAR(100),
 payload JSONB DEFAULT '{}'::jsonb,
 created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_events_type
ON automation_events(event_type);
