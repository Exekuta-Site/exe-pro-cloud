'use strict';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS entities (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  cloud_version INTEGER NOT NULL,
  origin_installation_id TEXT NOT NULL,
  origin_local_version INTEGER NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  payload_json JSONB,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS changes (
  seq BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  cloud_version INTEGER NOT NULL,
  origin_installation_id TEXT NOT NULL,
  origin_local_version INTEGER NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  payload_json JSONB,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_changes_seq ON changes(seq);
CREATE INDEX IF NOT EXISTS idx_entities_type_updated ON entities(entity_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS installations (
  installation_id TEXT PRIMARY KEY,
  label TEXT,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS web_sessions (
  token_hash TEXT PRIMARY KEY,
  csrf_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  device_label TEXT,
  user_id TEXT,
  username TEXT,
  role TEXT
);
CREATE INDEX IF NOT EXISTS idx_web_sessions_expires ON web_sessions(expires_at);

CREATE TABLE IF NOT EXISTS cloud_users (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_ci TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Super Admin',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS cloud_audit (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  username TEXT,
  ip TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS web_login_guard (
  guard_key TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cloud_settings (
  setting_key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS cloud_secrets (
  secret_key TEXT PRIMARY KEY,
  cipher_text TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  notification_id TEXT PRIMARY KEY,
  dedupe_key TEXT NOT NULL UNIQUE,
  lead_id TEXT NOT NULL,
  receivable_id TEXT,
  channel TEXT NOT NULL,
  kind TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  message_text TEXT,
  provider_message_id TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_due
  ON notification_outbox(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_lead
  ON notification_outbox(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wordpress_sites (
  site_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_url TEXT NOT NULL,
  site_url_norm TEXT NOT NULL UNIQUE,
  label TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  contract_allows_suspend BOOLEAN NOT NULL DEFAULT FALSE,
  auto_suspend BOOLEAN NOT NULL DEFAULT FALSE,
  auto_resume BOOLEAN NOT NULL DEFAULT TRUE,
  grace_days INTEGER NOT NULL DEFAULT 7,
  status TEXT NOT NULL DEFAULT 'Desconhecido',
  remote_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  suspend_mode TEXT,
  suspended_reason TEXT,
  last_checked_at TEXT,
  last_action_at TEXT,
  last_action TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  template_key TEXT NOT NULL DEFAULT 'institutional',
  progress_percent INTEGER NOT NULL DEFAULT 65,
  design_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS template_key TEXT NOT NULL DEFAULT 'institutional';
ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 65;
ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS design_json JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_wordpress_sites_lead
  ON wordpress_sites(lead_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wordpress_sites_status
  ON wordpress_sites(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS portal_users (
  user_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  username TEXT NOT NULL,
  username_ci TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Visualizador',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_portal_users_lead
  ON portal_users(lead_id, active);

CREATE TABLE IF NOT EXISTS portal_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  csrf_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires
  ON portal_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_user
  ON portal_sessions(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS portal_login_guard (
  guard_key TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_tickets (
  ticket_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  created_by_user_id TEXT,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'Aberto',
  assigned_to TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_lead
  ON portal_tickets(lead_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_status
  ON portal_tickets(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS portal_ticket_messages (
  message_id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  author_type TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_ticket_messages_ticket
  ON portal_ticket_messages(ticket_id, created_at ASC);

CREATE TABLE IF NOT EXISTS portal_files (
  file_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  ticket_id TEXT,
  category TEXT NOT NULL DEFAULT 'Arquivo',
  visibility TEXT NOT NULL DEFAULT 'Cliente',
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  content_bytes BYTEA NOT NULL,
  uploaded_by_type TEXT NOT NULL,
  uploaded_by_id TEXT,
  uploaded_by_name TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_files_lead
  ON portal_files(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_files_ticket
  ON portal_files(ticket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS core_schema_versions (
  version TEXT PRIMARY KEY,
  description TEXT,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS core_job_locks (
  job_key TEXT PRIMARY KEY,
  lock_token TEXT NOT NULL,
  locked_until TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS core_job_runs (
  run_id TEXT PRIMARY KEY,
  job_key TEXT NOT NULL,
  instance_id TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  duration_ms INTEGER,
  result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_text TEXT
);
CREATE INDEX IF NOT EXISTS idx_core_job_runs_job
  ON core_job_runs(job_key, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_job_runs_status
  ON core_job_runs(status, started_at DESC);

CREATE TABLE IF NOT EXISTS core_runtime_events (
  event_id TEXT PRIMARY KEY,
  severity TEXT NOT NULL DEFAULT 'info',
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_core_runtime_events_created
  ON core_runtime_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_core_runtime_events_severity
  ON core_runtime_events(severity, created_at DESC);

CREATE TABLE IF NOT EXISTS task_items (
  task_id TEXT PRIMARY KEY,
  lead_id TEXT,
  project_id TEXT,
  ticket_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'A fazer',
  priority TEXT NOT NULL DEFAULT 'Normal',
  assigned_user TEXT,
  due_at TEXT,
  sla_due_at TEXT,
  portal_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_task_items_lead
  ON task_items(lead_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_items_project
  ON task_items(project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_items_ticket
  ON task_items(ticket_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_items_status
  ON task_items(status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_items_assigned
  ON task_items(assigned_user, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_items_sla
  ON task_items(sla_due_at, status);

CREATE TABLE IF NOT EXISTS task_checklist (
  checklist_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  label TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  portal_visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_checklist_task
  ON task_checklist(task_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS task_comments (
  comment_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'Equipe',
  author_id TEXT,
  author_name TEXT,
  body TEXT NOT NULL,
  portal_visible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task
  ON task_comments(task_id, created_at ASC);

CREATE TABLE IF NOT EXISTS task_time_logs (
  time_log_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_name TEXT,
  minutes INTEGER NOT NULL,
  note TEXT,
  worked_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task
  ON task_time_logs(task_id, worked_at DESC);

CREATE TABLE IF NOT EXISTS billing_profiles (
  lead_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_generate BOOLEAN NOT NULL DEFAULT FALSE,
  consolidate_services BOOLEAN NOT NULL DEFAULT TRUE,
  billing_day INTEGER NOT NULL DEFAULT 10,
  grace_days INTEGER NOT NULL DEFAULT 0,
  late_fee_percent NUMERIC NOT NULL DEFAULT 0,
  monthly_interest_percent NUMERIC NOT NULL DEFAULT 0,
  early_discount_percent NUMERIC NOT NULL DEFAULT 0,
  early_discount_days INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  receivable_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  origin_key TEXT NOT NULL UNIQUE,
  principal_amount NUMERIC NOT NULL,
  due_date TEXT NOT NULL,
  payment_method TEXT,
  late_fee_percent NUMERIC NOT NULL DEFAULT 0,
  monthly_interest_percent NUMERIC NOT NULL DEFAULT 0,
  early_discount_percent NUMERIC NOT NULL DEFAULT 0,
  early_discount_days INTEGER NOT NULL DEFAULT 0,
  grace_days INTEGER NOT NULL DEFAULT 0,
  auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
  generated_at TEXT NOT NULL,
  generated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_lead
  ON billing_invoices(lead_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_period
  ON billing_invoices(period_key, due_date DESC);

CREATE TABLE IF NOT EXISTS billing_invoice_items (
  item_id TEXT PRIMARY KEY,
  receivable_id TEXT NOT NULL,
  service_id TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_amount NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_invoice_items_receivable
  ON billing_invoice_items(receivable_id);

CREATE TABLE IF NOT EXISTS billing_payments (
  payment_id TEXT PRIMARY KEY,
  receivable_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  paid_at TEXT NOT NULL,
  method TEXT,
  note TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_payments_receivable
  ON billing_payments(receivable_id, paid_at ASC);
CREATE INDEX IF NOT EXISTS idx_billing_payments_lead
  ON billing_payments(lead_id, paid_at DESC);

CREATE TABLE IF NOT EXISTS billing_runs (
  run_id TEXT PRIMARY KEY,
  period_key TEXT NOT NULL,
  created_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  run_at TEXT NOT NULL,
  run_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_billing_runs_period
  ON billing_runs(period_key, run_at DESC);

CREATE TABLE IF NOT EXISTS portal_documents (
  document_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TEXT,
  published_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_portal_documents_lead
  ON portal_documents(lead_id, published, updated_at DESC);

CREATE TABLE IF NOT EXISTS portal_document_decisions (
  decision_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  actor_user_id TEXT,
  actor_username TEXT,
  actor_name TEXT NOT NULL,
  comment TEXT,
  content_hash TEXT NOT NULL,
  snapshot_json JSONB NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_document_decisions_entity
  ON portal_document_decisions(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_document_decisions_lead
  ON portal_document_decisions(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seo_reports (
  report_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_url TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  period_label TEXT,
  status TEXT NOT NULL DEFAULT 'Rascunho',
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  highlights_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_seo_reports_lead
  ON seo_reports(lead_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_seo_reports_status
  ON seo_reports(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS seo_keywords (
  keyword_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  position NUMERIC,
  previous_position NUMERIC,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  landing_page TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_report
  ON seo_keywords(report_id, position ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS seo_pagespeed_runs (
  run_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  site_url TEXT NOT NULL,
  strategy TEXT NOT NULL,
  performance_score INTEGER,
  lcp_ms NUMERIC,
  cls NUMERIC,
  inp_ms NUMERIC,
  raw_json JSONB,
  created_at TEXT NOT NULL,
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_seo_pagespeed_lead
  ON seo_pagespeed_runs(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_payment_proofs (
  proof_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  receivable_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  submitted_by_user_id TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'Aguardando conferencia',
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  reviewed_by TEXT,
  review_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_portal_payment_proofs_lead
  ON portal_payment_proofs(lead_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_payment_proofs_receivable
  ON portal_payment_proofs(receivable_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  conversation_id TEXT PRIMARY KEY,
  lead_id TEXT,
  phone_number TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'Aberta',
  last_message_at TEXT,
  last_inbound_at TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last
  ON whatsapp_conversations(last_message_at DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead
  ON whatsapp_conversations(lead_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  message_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  provider_message_id TEXT UNIQUE,
  direction TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  body TEXT,
  status TEXT NOT NULL DEFAULT 'Received',
  error_text TEXT,
  sent_by TEXT,
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation
  ON whatsapp_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_provider
  ON whatsapp_messages(provider_message_id);

CREATE TABLE IF NOT EXISTS whatsapp_onboarding_states (
  state_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_onboarding_states_expires
  ON whatsapp_onboarding_states(expires_at);


`;

async function initSchema(pool) {
  await pool.query(SCHEMA_SQL);
  const now = new Date().toISOString();
  await pool.query(
    "INSERT INTO core_schema_versions(version,description,applied_at) VALUES($1,$2,$3) ON CONFLICT(version) DO UPDATE SET description=EXCLUDED.description",
    ['4.3.0','WhatsApp Business Central de Conversas + QR Code oficial',now]
  );
}

module.exports = { initSchema, SCHEMA_SQL };
