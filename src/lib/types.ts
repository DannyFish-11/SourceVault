// Core data models for SourceVault

export enum SourceType {
  OFFICIAL_SITE = 'official_site',
  GITHUB_REPO = 'github_repo',
  GITHUB_RELEASE = 'github_release',
  GITHUB_DOCS = 'github_docs',
  ARXIV = 'arxiv',
  CROSSREF = 'crossref',
  BLOG = 'blog',
  FORUM = 'forum',
  MEDIA = 'media',
}

export enum TrustLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ArtifactStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  SAVED = 'saved',
  ARCHIVED = 'archived',
}

export interface Source {
  id: string;
  type: SourceType;
  url: string;
  name: string;
  trustLevel: TrustLevel;
  lastChecked: Date;
  metadata?: Record<string, unknown>;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  sources: string[]; // Source IDs
  createdAt: Date;
  updatedAt: Date;
  artifactCount: number;
}

export interface Artifact {
  id: string;
  sourceId: string;
  topicIds: string[];
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
  discoveredAt: Date;
  updatedAt?: Date;
  trustLevel: TrustLevel;
  status: ArtifactStatus;
  metadata?: Record<string, unknown>;
}

export interface Event {
  id: string;
  artifactId: string;
  type: 'discovered' | 'updated' | 'status_changed';
  timestamp: Date;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  artifactIds: string[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface Digest {
  id: string;
  type: 'daily' | 'weekly';
  generatedAt: Date;
  artifacts: string[]; // Artifact IDs
  topicSummaries: {
    topicId: string;
    newCount: number;
    updatedCount: number;
  }[];
}

export interface Signal {
  id: string;
  type: 'alert' | 'review_request' | 'update_notification';
  artifactId: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

// Runtime types for local-first architecture

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ExportJob {
  id: string;
  artifactId: string;
  status: ExportStatus;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

export interface SyncState {
  id: string;
  lastSyncAt?: Date;
  usbConnected: boolean;
  usbPath?: string;
  pendingExports: number;
  failedExports: number;
  totalExports: number;
}

export interface RuntimeSettings {
  usbVaultPath?: string;
  usbVaultName?: string;
  scheduleInterval: number; // minutes
  autoSync: boolean;
  maxRetries: number;
}

export interface RuntimeStatus {
  running: boolean;
  lastCheck?: Date;
  syncState: SyncState;
  settings: RuntimeSettings;
}

export interface RuntimeLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
