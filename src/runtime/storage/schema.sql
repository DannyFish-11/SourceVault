-- SourceVault Local Database Schema

-- Topics
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  artifact_count INTEGER DEFAULT 0
);

-- Sources
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  trust_level TEXT NOT NULL,
  last_checked INTEGER NOT NULL,
  metadata TEXT
);

-- Topic Sources (many-to-many)
CREATE TABLE IF NOT EXISTS topic_sources (
  topic_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  PRIMARY KEY (topic_id, source_id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- Artifacts
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  discovered_at INTEGER NOT NULL,
  updated_at INTEGER,
  trust_level TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id)
);

-- Artifact Topics (many-to-many)
CREATE TABLE IF NOT EXISTS artifact_topics (
  artifact_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  PRIMARY KEY (artifact_id, topic_id),
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  changes TEXT,
  metadata TEXT,
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  tags TEXT
);

-- Collection Artifacts (many-to-many)
CREATE TABLE IF NOT EXISTS collection_artifacts (
  collection_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  PRIMARY KEY (collection_id, artifact_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id),
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
);

-- Digests
CREATE TABLE IF NOT EXISTS digests (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  generated_at INTEGER NOT NULL,
  topic_summaries TEXT
);

-- Digest Artifacts (many-to-many)
CREATE TABLE IF NOT EXISTS digest_artifacts (
  digest_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  PRIMARY KEY (digest_id, artifact_id),
  FOREIGN KEY (digest_id) REFERENCES digests(id),
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
);

-- Export Jobs
CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at);

-- Sync State
CREATE TABLE IF NOT EXISTS sync_state (
  id TEXT PRIMARY KEY,
  last_sync_at INTEGER,
  usb_connected INTEGER NOT NULL DEFAULT 0,
  usb_path TEXT,
  pending_exports INTEGER DEFAULT 0,
  failed_exports INTEGER DEFAULT 0,
  total_exports INTEGER DEFAULT 0
);

-- Runtime Settings
CREATE TABLE IF NOT EXISTS runtime_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Runtime Logs
CREATE TABLE IF NOT EXISTS runtime_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_runtime_logs_timestamp ON runtime_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_runtime_logs_level ON runtime_logs(level);

-- Initialize default sync state
INSERT OR IGNORE INTO sync_state (id, usb_connected, pending_exports, failed_exports, total_exports)
VALUES ('default', 0, 0, 0, 0);

-- Credentials
CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  label TEXT NOT NULL,
  value_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unverified',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_verified_at INTEGER,
  expires_at INTEGER,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_credentials_target ON credentials(target);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);

-- Admission Decisions
CREATE TABLE IF NOT EXISTS admission_decisions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason_codes TEXT NOT NULL,
  trust_score REAL NOT NULL,
  policy_mode TEXT NOT NULL,
  reviewer_required INTEGER NOT NULL DEFAULT 0,
  decided_at INTEGER NOT NULL,
  admitted_at INTEGER,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_admission_decisions_item_id ON admission_decisions(item_id);
CREATE INDEX IF NOT EXISTS idx_admission_decisions_decision ON admission_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_admission_decisions_decided_at ON admission_decisions(decided_at);

-- Delivery Jobs
CREATE TABLE IF NOT EXISTS delivery_jobs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  payload TEXT,
  target_path TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status ON delivery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_target ON delivery_jobs(target);
CREATE INDEX IF NOT EXISTS idx_delivery_jobs_created_at ON delivery_jobs(created_at);

-- Push Policies
CREATE TABLE IF NOT EXISTS push_policies (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  condition TEXT NOT NULL,
  action TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_push_policies_target ON push_policies(target);
CREATE INDEX IF NOT EXISTS idx_push_policies_enabled ON push_policies(enabled);
CREATE INDEX IF NOT EXISTS idx_push_policies_priority ON push_policies(priority);

-- Behavior Signals
CREATE TABLE IF NOT EXISTS behavior_signals (
  id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  recorded_at INTEGER NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_behavior_signals_subject ON behavior_signals(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_behavior_signals_recorded_at ON behavior_signals(recorded_at);

-- Search Plans
CREATE TABLE IF NOT EXISTS search_plans (
  id TEXT PRIMARY KEY,
  topic_id TEXT,
  base_query TEXT NOT NULL,
  layers TEXT NOT NULL,
  connectors TEXT NOT NULL,
  priority TEXT NOT NULL,
  executed_at INTEGER,
  candidate_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_search_plans_topic_id ON search_plans(topic_id);
CREATE INDEX IF NOT EXISTS idx_search_plans_executed_at ON search_plans(executed_at);

-- Initialize default settings
INSERT OR IGNORE INTO runtime_settings (key, value) VALUES ('scheduleInterval', '60');
INSERT OR IGNORE INTO runtime_settings (key, value) VALUES ('autoSync', 'true');
INSERT OR IGNORE INTO runtime_settings (key, value) VALUES ('maxRetries', '3');
INSERT OR IGNORE INTO runtime_settings (key, value) VALUES ('policyMode', 'strict');
INSERT OR IGNORE INTO runtime_settings (key, value) VALUES ('trustThreshold', '0.7');
