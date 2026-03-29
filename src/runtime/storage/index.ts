import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getDatabase(): Database.Database {
  const dbPath = join(process.cwd(), '.sourcevault', 'vault.db');
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  return db;
}

export function initializeDatabase(): void {
  const db = getDatabase();
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

  // Execute schema
  db.exec(schema);

  console.log('Database initialized successfully');
  db.close();
}

export interface StorageAdapter {
  // Topics
  createTopic(topic: any): void;
  getTopic(id: string): any | null;
  getAllTopics(): any[];
  updateTopic(id: string, updates: any): void;

  // Sources
  createSource(source: any): void;
  getSource(id: string): any | null;
  getAllSources(): any[];

  // Artifacts
  createArtifact(artifact: any): void;
  getArtifact(id: string): any | null;
  getArtifactsByTopic(topicId: string): any[];
  getArtifactsByStatus(status: string): any[];
  updateArtifact(id: string, updates: any): void;

  // Events
  createEvent(event: any): void;
  getEventsByArtifact(artifactId: string): any[];

  // Export Jobs
  createExportJob(job: any): void;
  getExportJob(id: string): any | null;
  getPendingExportJobs(): any[];
  getFailedExportJobs(): any[];
  updateExportJob(id: string, updates: any): void;

  // Sync State
  getSyncState(): any;
  updateSyncState(updates: any): void;

  // Settings
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
  getAllSettings(): Record<string, string>;

  // Logs
  createLog(log: any): void;
  getRecentLogs(limit: number): any[];

  // Credentials
  createCredential(credential: any): void;
  getCredential(id: string): any | null;
  getCredentialsByTarget(target: string): any[];
  updateCredentialStatus(id: string, status: string, lastVerifiedAt?: Date): void;
  deleteCredential(id: string): void;

  // Admission Decisions
  createAdmissionDecision(decision: any): void;
  getAdmissionDecision(id: string): any | null;
  getAdmissionDecisionByItemId(itemId: string): any | null;
  getAdmissionDecisionsByDecision(decision: string): any[];

  // Delivery Jobs
  createDeliveryJob(job: any): void;
  getDeliveryJob(id: string): any | null;
  getDeliveryJobsByStatus(status: string): any[];
  getDeliveryJobsByTarget(target: string): any[];
  updateDeliveryJob(id: string, updates: any): void;

  // Push Policies
  createPushPolicy(policy: any): void;
  getPushPolicy(id: string): any | null;
  getPushPoliciesByTarget(target: string): any[];
  getEnabledPushPolicies(): any[];
  updatePushPolicy(id: string, updates: any): void;
  deletePushPolicy(id: string): void;

  // Behavior Signals
  createBehaviorSignal(signal: any): void;
  getBehaviorSignalsBySubject(subjectType: string, subjectId: string): any[];
  getRecentBehaviorSignals(limit: number): any[];

  // Search Plans
  createSearchPlan(plan: any): void;
  getSearchPlan(id: string): any | null;
  getSearchPlansByTopic(topicId: string): any[];
  updateSearchPlan(id: string, updates: any): void;
}

export class SQLiteAdapter implements StorageAdapter {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  // Topics
  createTopic(topic: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO topics (id, name, description, created_at, updated_at, artifact_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      topic.id,
      topic.name,
      topic.description,
      topic.createdAt.getTime(),
      topic.updatedAt.getTime(),
      topic.artifactCount || 0
    );

    // Insert topic sources
    if (topic.sources && topic.sources.length > 0) {
      const sourceStmt = this.db.prepare(`
        INSERT INTO topic_sources (topic_id, source_id) VALUES (?, ?)
      `);
      for (const sourceId of topic.sources) {
        sourceStmt.run(topic.id, sourceId);
      }
    }
  }

  getTopic(id: string): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM topics WHERE id = ?
    `);
    const row = stmt.get(id) as any;
    if (!row) return null;

    // Get sources
    const sourcesStmt = this.db.prepare(`
      SELECT source_id FROM topic_sources WHERE topic_id = ?
    `);
    const sources = sourcesStmt.all(id).map((r: any) => r.source_id);

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sources,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      artifactCount: row.artifact_count,
    };
  }

  getAllTopics(): any[] {
    const stmt = this.db.prepare(`SELECT * FROM topics ORDER BY updated_at DESC`);
    const rows = stmt.all() as any[];
    return rows.map(row => this.getTopic(row.id)).filter(Boolean);
  }

  updateTopic(id: string, updates: any): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.artifactCount !== undefined) {
      fields.push('artifact_count = ?');
      values.push(updates.artifactCount);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE topics SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  // Sources
  createSource(source: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO sources (id, type, url, name, trust_level, last_checked, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      source.id,
      source.type,
      source.url,
      source.name,
      source.trustLevel,
      source.lastChecked.getTime(),
      source.metadata ? JSON.stringify(source.metadata) : null
    );
  }

  getSource(id: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM sources WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      type: row.type,
      url: row.url,
      name: row.name,
      trustLevel: row.trust_level,
      lastChecked: new Date(row.last_checked),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  getAllSources(): any[] {
    const stmt = this.db.prepare(`SELECT * FROM sources`);
    const rows = stmt.all() as any[];
    return rows.map(row => this.getSource(row.id)).filter(Boolean);
  }

  // Artifacts
  createArtifact(artifact: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO artifacts (id, source_id, title, summary, url, published_at, discovered_at, updated_at, trust_level, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      artifact.id,
      artifact.sourceId,
      artifact.title,
      artifact.summary,
      artifact.url,
      artifact.publishedAt.getTime(),
      artifact.discoveredAt.getTime(),
      artifact.updatedAt ? artifact.updatedAt.getTime() : null,
      artifact.trustLevel,
      artifact.status,
      artifact.metadata ? JSON.stringify(artifact.metadata) : null
    );

    // Insert artifact topics
    if (artifact.topicIds && artifact.topicIds.length > 0) {
      const topicStmt = this.db.prepare(`
        INSERT INTO artifact_topics (artifact_id, topic_id) VALUES (?, ?)
      `);
      for (const topicId of artifact.topicIds) {
        topicStmt.run(artifact.id, topicId);
      }
    }
  }

  getArtifact(id: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM artifacts WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    // Get topics
    const topicsStmt = this.db.prepare(`
      SELECT topic_id FROM artifact_topics WHERE artifact_id = ?
    `);
    const topicIds = topicsStmt.all(id).map((r: any) => r.topic_id);

    return {
      id: row.id,
      sourceId: row.source_id,
      topicIds,
      title: row.title,
      summary: row.summary,
      url: row.url,
      publishedAt: new Date(row.published_at),
      discoveredAt: new Date(row.discovered_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      trustLevel: row.trust_level,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  getArtifactsByTopic(topicId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT artifact_id FROM artifact_topics WHERE topic_id = ?
    `);
    const rows = stmt.all(topicId) as any[];
    return rows.map(row => this.getArtifact(row.artifact_id)).filter(Boolean);
  }

  getArtifactsByStatus(status: string): any[] {
    const stmt = this.db.prepare(`
      SELECT id FROM artifacts WHERE status = ? ORDER BY discovered_at DESC
    `);
    const rows = stmt.all(status) as any[];
    return rows.map(row => this.getArtifact(row.id)).filter(Boolean);
  }

  updateArtifact(id: string, updates: any): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.updatedAt !== undefined) {
      fields.push('updated_at = ?');
      values.push(updates.updatedAt.getTime());
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE artifacts SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  // Events
  createEvent(event: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (id, artifact_id, type, timestamp, changes, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.artifactId,
      event.type,
      event.timestamp.getTime(),
      event.changes ? JSON.stringify(event.changes) : null,
      event.metadata ? JSON.stringify(event.metadata) : null
    );
  }

  getEventsByArtifact(artifactId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events WHERE artifact_id = ? ORDER BY timestamp DESC
    `);
    const rows = stmt.all(artifactId) as any[];
    return rows.map(row => ({
      id: row.id,
      artifactId: row.artifact_id,
      type: row.type,
      timestamp: new Date(row.timestamp),
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  // Export Jobs
  createExportJob(job: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO export_jobs (id, artifact_id, status, created_at, completed_at, error, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      job.id,
      job.artifactId,
      job.status,
      job.createdAt.getTime(),
      job.completedAt ? job.completedAt.getTime() : null,
      job.error || null,
      job.retryCount || 0
    );
  }

  getExportJob(id: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM export_jobs WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      artifactId: row.artifact_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      error: row.error || undefined,
      retryCount: row.retry_count,
    };
  }

  getPendingExportJobs(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM export_jobs WHERE status = 'pending' ORDER BY created_at ASC
    `);
    const rows = stmt.all() as any[];
    return rows.map(row => this.getExportJob(row.id)).filter(Boolean);
  }

  getFailedExportJobs(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM export_jobs WHERE status = 'failed' ORDER BY created_at DESC
    `);
    const rows = stmt.all() as any[];
    return rows.map(row => this.getExportJob(row.id)).filter(Boolean);
  }

  updateExportJob(id: string, updates: any): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt.getTime());
    }
    if (updates.error !== undefined) {
      fields.push('error = ?');
      values.push(updates.error);
    }
    if (updates.retryCount !== undefined) {
      fields.push('retry_count = ?');
      values.push(updates.retryCount);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE export_jobs SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  // Sync State
  getSyncState(): any {
    const stmt = this.db.prepare(`SELECT * FROM sync_state WHERE id = 'default'`);
    const row = stmt.get() as any;

    return {
      id: row.id,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
      usbConnected: Boolean(row.usb_connected),
      usbPath: row.usb_path || undefined,
      pendingExports: row.pending_exports,
      failedExports: row.failed_exports,
      totalExports: row.total_exports,
    };
  }

  updateSyncState(updates: any): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.lastSyncAt !== undefined) {
      fields.push('last_sync_at = ?');
      values.push(updates.lastSyncAt.getTime());
    }
    if (updates.usbConnected !== undefined) {
      fields.push('usb_connected = ?');
      values.push(updates.usbConnected ? 1 : 0);
    }
    if (updates.usbPath !== undefined) {
      fields.push('usb_path = ?');
      values.push(updates.usbPath);
    }
    if (updates.pendingExports !== undefined) {
      fields.push('pending_exports = ?');
      values.push(updates.pendingExports);
    }
    if (updates.failedExports !== undefined) {
      fields.push('failed_exports = ?');
      values.push(updates.failedExports);
    }
    if (updates.totalExports !== undefined) {
      fields.push('total_exports = ?');
      values.push(updates.totalExports);
    }

    values.push('default');

    const stmt = this.db.prepare(`
      UPDATE sync_state SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  // Settings
  getSetting(key: string): string | null {
    const stmt = this.db.prepare(`SELECT value FROM runtime_settings WHERE key = ?`);
    const row = stmt.get(key) as any;
    return row ? row.value : null;
  }

  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO runtime_settings (key, value) VALUES (?, ?)
    `);
    stmt.run(key, value);
  }

  getAllSettings(): Record<string, string> {
    const stmt = this.db.prepare(`SELECT key, value FROM runtime_settings`);
    const rows = stmt.all() as any[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  // Logs
  createLog(log: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO runtime_logs (id, level, message, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      log.id,
      log.level,
      log.message,
      log.timestamp.getTime(),
      log.metadata ? JSON.stringify(log.metadata) : null
    );
  }

  getRecentLogs(limit: number = 100): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM runtime_logs ORDER BY timestamp DESC LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      id: row.id,
      level: row.level,
      message: row.message,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  // Credentials
  createCredential(credential: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO credentials (id, target, auth_type, label, value_ref, status, created_at, updated_at, last_verified_at, expires_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      credential.id,
      credential.target,
      credential.authType,
      credential.label,
      credential.valueRef,
      credential.status,
      credential.createdAt.getTime(),
      credential.updatedAt.getTime(),
      credential.lastVerifiedAt ? credential.lastVerifiedAt.getTime() : null,
      credential.expiresAt ? credential.expiresAt.getTime() : null,
      credential.metadata ? JSON.stringify(credential.metadata) : null
    );
  }

  getCredential(id: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM credentials WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      target: row.target,
      authType: row.auth_type,
      label: row.label,
      valueRef: row.value_ref,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at) : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  getCredentialsByTarget(target: string): any[] {
    const stmt = this.db.prepare(`SELECT * FROM credentials WHERE target = ?`);
    const rows = stmt.all(target) as any[];
    return rows.map(row => this.getCredential(row.id)).filter(Boolean);
  }

  updateCredentialStatus(id: string, status: string, lastVerifiedAt?: Date): void {
    const stmt = this.db.prepare(`
      UPDATE credentials SET status = ?, last_verified_at = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(status, lastVerifiedAt ? lastVerifiedAt.getTime() : null, Date.now(), id);
  }

  deleteCredential(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM credentials WHERE id = ?`);
    stmt.run(id);
  }

  // Admission Decisions
  createAdmissionDecision(decision: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO admission_decisions (id, item_id, item_type, decision, reason_codes, trust_score, policy_mode, reviewer_required, decided_at, admitted_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      decision.id,
      decision.itemId,
      decision.itemType,
      decision.decision,
      JSON.stringify(decision.reasonCodes),
      decision.trustScore,
      decision.policyMode,
      decision.reviewerRequired ? 1 : 0,
      decision.decidedAt.getTime(),
      decision.admittedAt ? decision.admittedAt.getTime() : null,
      decision.metadata ? JSON.stringify(decision.metadata) : null
    );
  }

  getAdmissionDecision(id: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM admission_decisions WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      itemId: row.item_id,
      itemType: row.item_type,
      decision: row.decision,
      reasonCodes: JSON.parse(row.reason_codes),
      trustScore: row.trust_score,
      policyMode: row.policy_mode,
      reviewerRequired: Boolean(row.reviewer_required),
      decidedAt: new Date(row.decided_at),
      admittedAt: row.admitted_at ? new Date(row.admitted_at) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  getAdmissionDecisionByItemId(itemId: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM admission_decisions WHERE item_id = ? ORDER BY decided_at DESC LIMIT 1`);
    const row = stmt.get(itemId) as any;
    if (!row) return null;
    return this.getAdmissionDecision(row.id);
  }

  getAdmissionDecisionsByDecision(decision: string): any[] {
    const stmt = this.db.prepare(`SELECT * FROM admission_decisions WHERE decision = ? ORDER BY decided_at DESC`);
    const rows = stmt.all(decision) as any[];
    return rows.map(row => this.getAdmissionDecision(row.id)).filter(Boolean);
  }

  // Delivery Jobs
  createDeliveryJob(job: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO delivery_jobs (id, item_id, item_type, target, status, payload, target_path, attempts, max_attempts, last_error, created_at, updated_at, synced_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      job.id,
      job.itemId,
      job.itemType,
      job.target,
      job.status,
      job.payload ? JSON.stringify(job.payload) : null,
      job.targetPath || null,
      job.attempts || 0,
      job.maxAttempts || 3,
      job.lastError || null,
      job.createdAt.getTime(),
      job.updatedAt.getTime(),
      job.syncedAt ? job.syncedAt.getTime() : null,
      job.metadata ? JSON.stringify(job.metadata) : null
    );
  }

  getDeliveryJob(id: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM delivery_jobs WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      itemId: row.item_id,
      itemType: row.item_type,
      target: row.target,
      status: row.status,
      payload: row.payload ? JSON.parse(row.payload) : undefined,
      targetPath: row.target_path || undefined,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lastError: row.last_error || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      syncedAt: row.synced_at ? new Date(row.synced_at) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  getDeliveryJobsByStatus(status: string): any[] {
    const stmt = this.db.prepare(`SELECT * FROM delivery_jobs WHERE status = ? ORDER BY created_at ASC`);
    const rows = stmt.all(status) as any[];
    return rows.map(row => this.getDeliveryJob(row.id)).filter(Boolean);
  }

  getDeliveryJobsByTarget(target: string): any[] {
    const stmt = this.db.prepare(`SELECT * FROM delivery_jobs WHERE target = ? ORDER BY created_at DESC`);
    const rows = stmt.all(target) as any[];
    return rows.map(row => this.getDeliveryJob(row.id)).filter(Boolean);
  }

  updateDeliveryJob(id: string, updates: any): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.attempts !== undefined) {
      fields.push('attempts = ?');
      values.push(updates.attempts);
    }
    if (updates.lastError !== undefined) {
      fields.push('last_error = ?');
      values.push(updates.lastError);
    }
    if (updates.syncedAt !== undefined) {
      fields.push('synced_at = ?');
      values.push(updates.syncedAt.getTime());
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE delivery_jobs SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  // Push Policies
  createPushPolicy(policy: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO push_policies (id, target, rule_type, condition, action, priority, enabled, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      policy.id,
      policy.target,
      policy.ruleType,
      policy.condition,
      policy.action,
      policy.priority || 0,
      policy.enabled ? 1 : 0,
      policy.createdAt.getTime(),
      policy.updatedAt.getTime(),
      policy.metadata ? JSON.stringify(policy.metadata) : null
    );
  }

  getPushPolicy(id: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM push_policies WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      target: row.target,
      ruleType: row.rule_type,
      condition: row.condition,
      action: row.action,
      priority: row.priority,
      enabled: Boolean(row.enabled),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  getPushPoliciesByTarget(target: string): any[] {
    const stmt = this.db.prepare(`SELECT * FROM push_policies WHERE target = ? ORDER BY priority DESC`);
    const rows = stmt.all(target) as any[];
    return rows.map(row => this.getPushPolicy(row.id)).filter(Boolean);
  }

  getEnabledPushPolicies(): any[] {
    const stmt = this.db.prepare(`SELECT * FROM push_policies WHERE enabled = 1 ORDER BY priority DESC`);
    const rows = stmt.all() as any[];
    return rows.map(row => this.getPushPolicy(row.id)).filter(Boolean);
  }

  updatePushPolicy(id: string, updates: any): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE push_policies SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  deletePushPolicy(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM push_policies WHERE id = ?`);
    stmt.run(id);
  }

  // Behavior Signals
  createBehaviorSignal(signal: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO behavior_signals (id, signal_type, subject_type, subject_id, weight, recorded_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      signal.id,
      signal.signalType,
      signal.subjectType,
      signal.subjectId,
      signal.weight,
      signal.recordedAt.getTime(),
      signal.metadata ? JSON.stringify(signal.metadata) : null
    );
  }

  getBehaviorSignalsBySubject(subjectType: string, subjectId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM behavior_signals WHERE subject_type = ? AND subject_id = ? ORDER BY recorded_at DESC
    `);
    const rows = stmt.all(subjectType, subjectId) as any[];
    return rows.map(row => ({
      id: row.id,
      signalType: row.signal_type,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      weight: row.weight,
      recordedAt: new Date(row.recorded_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  getRecentBehaviorSignals(limit: number = 100): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM behavior_signals ORDER BY recorded_at DESC LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      id: row.id,
      signalType: row.signal_type,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      weight: row.weight,
      recordedAt: new Date(row.recorded_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  // Search Plans
  createSearchPlan(plan: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO search_plans (id, topic_id, base_query, layers, connectors, priority, executed_at, candidate_count, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      plan.id,
      plan.topicId || null,
      plan.baseQuery,
      JSON.stringify(plan.layers),
      JSON.stringify(plan.connectors),
      plan.priority,
      plan.executedAt ? plan.executedAt.getTime() : null,
      plan.candidateCount || 0,
      plan.createdAt.getTime(),
      plan.metadata ? JSON.stringify(plan.metadata) : null
    );
  }

  getSearchPlan(id: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM search_plans WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      topicId: row.topic_id || undefined,
      baseQuery: row.base_query,
      layers: JSON.parse(row.layers),
      connectors: JSON.parse(row.connectors),
      priority: row.priority,
      executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
      candidateCount: row.candidate_count,
      createdAt: new Date(row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  getSearchPlansByTopic(topicId: string): any[] {
    const stmt = this.db.prepare(`SELECT * FROM search_plans WHERE topic_id = ? ORDER BY created_at DESC`);
    const rows = stmt.all(topicId) as any[];
    return rows.map(row => this.getSearchPlan(row.id)).filter(Boolean);
  }

  updateSearchPlan(id: string, updates: any): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.executedAt !== undefined) {
      fields.push('executed_at = ?');
      values.push(updates.executedAt.getTime());
    }
    if (updates.candidateCount !== undefined) {
      fields.push('candidate_count = ?');
      values.push(updates.candidateCount);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE search_plans SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  close(): void {
    this.db.close();
  }
}
