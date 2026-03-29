import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface RuntimeSettings {
  startupEnabled: boolean;
  backgroundMode: boolean;
  scheduleEnabled: boolean;
  defaultFrequency: 'hourly' | 'daily' | 'weekly';
  maxConcurrentJobs: number;
  retryFailedJobs: boolean;
}

export interface ConnectorSettings {
  github: {
    enabled: boolean;
    authMode: 'token' | 'oauth' | 'none';
    tokenRef?: string;
    includeReleases: boolean;
    includeReadme: boolean;
    includeIssues: boolean;
    maxResultsPerQuery: number;
  };
  arxiv: {
    enabled: boolean;
    categories: string[];
    authorWatch: string[];
    includeVersionUpdates: boolean;
    maxResultsPerQuery: number;
  };
  perplexity: {
    enabled: boolean;
    apiKeyRef?: string;
    mode: 'discovery' | 'search' | 'supplemental';
    maxResultsPerQuery: number;
    domainAllowlist: string[];
    domainBlocklist: string[];
  };
}

export interface StorageSettings {
  localVaultPath: string;
  snapshotPath: string;
  queuePath: string;
  logPath: string;
}

export interface DeliverySettings {
  autoDeliver: boolean;
  retryFailedDeliveries: boolean;
  maxDeliveryAttempts: number;
  manualOverrideEnabled: boolean;
}

export interface TargetSettings {
  raw: {
    enabled: boolean;
  };
  usb: {
    enabled: boolean;
    targetMode: 'path' | 'volumeName';
    targetValue: string;
    autoSyncOnDetect: boolean;
  };
  obsidian: {
    enabled: boolean;
    vaultPath: string;
    autoPush: boolean;
  };
  notebook: {
    enabled: boolean;
    workspacePath: string;
    autoBundle: boolean;
  };
  notion: {
    enabled: boolean;
    tokenRef?: string;
    topicsDatabaseId?: string;
    artifactsDatabaseId?: string;
    digestsDatabaseId?: string;
    autoSync: boolean;
  };
}

export interface PolicySettings {
  sourcePolicy: 'strict' | 'balanced' | 'broad';
  trustThresholdForVault: number;
  trustThresholdForUSB: number;
  allowSecondarySources: boolean;
  blockedDomains: string[];
  requireCanonicalSourceLink: boolean;
}

export interface BehaviorSettings {
  enabled: boolean;
  retentionDays: number;
  useForRecommendations: boolean;
  useForScheduling: boolean;
  useForArchival: false;
}

export interface UISettings {
  showRuntimeStatus: boolean;
  showTargetHealth: boolean;
  showQueueState: boolean;
  compactView: boolean;
}

export interface SourceVaultSettings {
  runtime: RuntimeSettings;
  connectors: ConnectorSettings;
  storage: StorageSettings;
  delivery: DeliverySettings;
  targets: TargetSettings;
  policy: PolicySettings;
  behavior: BehaviorSettings;
  ui: UISettings;
}

export class SettingsLoader {
  private configPath: string;
  private settings: SourceVaultSettings | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath || join(process.cwd(), '.sourcevault', 'config.json');
  }

  load(): SourceVaultSettings {
    if (this.settings) {
      return this.settings;
    }

    if (!existsSync(this.configPath)) {
      this.settings = this.getDefaultSettings();
      this.save();
      return this.settings;
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      const loaded = JSON.parse(content);
      this.settings = this.mergeWithDefaults(loaded);
      this.validate();
      return this.settings;
    } catch (error) {
      console.error('Failed to load settings, using defaults:', error);
      this.settings = this.getDefaultSettings();
      return this.settings;
    }
  }

  save(): void {
    if (!this.settings) {
      throw new Error('No settings to save');
    }

    const dir = join(this.configPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), 'utf-8');
  }

  update(updates: Partial<SourceVaultSettings>): void {
    if (!this.settings) {
      this.load();
    }

    this.settings = {
      ...this.settings!,
      ...updates,
    };

    this.validate();
    this.save();
  }

  resolveSecret(ref: string): string | null {
    // Try environment variable first
    const envValue = process.env[ref];
    if (envValue) {
      return envValue;
    }

    // Try local secrets file
    const secretsPath = join(process.cwd(), '.sourcevault', 'secrets.json');
    if (existsSync(secretsPath)) {
      try {
        const secrets = JSON.parse(readFileSync(secretsPath, 'utf-8'));
        return secrets[ref] || null;
      } catch {
        return null;
      }
    }

    return null;
  }

  private getDefaultSettings(): SourceVaultSettings {
    return {
      runtime: {
        startupEnabled: false,
        backgroundMode: false,
        scheduleEnabled: true,
        defaultFrequency: 'daily',
        maxConcurrentJobs: 3,
        retryFailedJobs: true,
      },
      connectors: {
        github: {
          enabled: false,
          authMode: 'none',
          includeReleases: true,
          includeReadme: true,
          includeIssues: false,
          maxResultsPerQuery: 10,
        },
        arxiv: {
          enabled: false,
          categories: [],
          authorWatch: [],
          includeVersionUpdates: false,
          maxResultsPerQuery: 10,
        },
        perplexity: {
          enabled: false,
          mode: 'supplemental',
          maxResultsPerQuery: 5,
          domainAllowlist: [],
          domainBlocklist: [],
        },
      },
      storage: {
        localVaultPath: join(process.cwd(), '.sourcevault', 'vault'),
        snapshotPath: join(process.cwd(), '.sourcevault', 'snapshots'),
        queuePath: join(process.cwd(), '.sourcevault', 'queue'),
        logPath: join(process.cwd(), '.sourcevault', 'logs'),
      },
      delivery: {
        autoDeliver: true,
        retryFailedDeliveries: true,
        maxDeliveryAttempts: 3,
        manualOverrideEnabled: true,
      },
      targets: {
        raw: {
          enabled: true,
        },
        usb: {
          enabled: false,
          targetMode: 'path',
          targetValue: '',
          autoSyncOnDetect: true,
        },
        obsidian: {
          enabled: false,
          vaultPath: '',
          autoPush: false,
        },
        notebook: {
          enabled: false,
          workspacePath: '',
          autoBundle: false,
        },
        notion: {
          enabled: false,
          autoSync: false,
        },
      },
      policy: {
        sourcePolicy: 'strict',
        trustThresholdForVault: 0.7,
        trustThresholdForUSB: 0.8,
        allowSecondarySources: false,
        blockedDomains: [],
        requireCanonicalSourceLink: true,
      },
      behavior: {
        enabled: false,
        retentionDays: 90,
        useForRecommendations: true,
        useForScheduling: true,
        useForArchival: false,
      },
      ui: {
        showRuntimeStatus: true,
        showTargetHealth: true,
        showQueueState: true,
        compactView: false,
      },
    };
  }

  private mergeWithDefaults(loaded: any): SourceVaultSettings {
    const defaults = this.getDefaultSettings();

    return {
      runtime: { ...defaults.runtime, ...loaded.runtime },
      connectors: {
        github: { ...defaults.connectors.github, ...loaded.connectors?.github },
        arxiv: { ...defaults.connectors.arxiv, ...loaded.connectors?.arxiv },
        perplexity: { ...defaults.connectors.perplexity, ...loaded.connectors?.perplexity },
      },
      storage: { ...defaults.storage, ...loaded.storage },
      delivery: { ...defaults.delivery, ...loaded.delivery },
      targets: {
        raw: { ...defaults.targets.raw, ...loaded.targets?.raw },
        usb: { ...defaults.targets.usb, ...loaded.targets?.usb },
        obsidian: { ...defaults.targets.obsidian, ...loaded.targets?.obsidian },
        notebook: { ...defaults.targets.notebook, ...loaded.targets?.notebook },
        notion: { ...defaults.targets.notion, ...loaded.targets?.notion },
      },
      policy: { ...defaults.policy, ...loaded.policy },
      behavior: { ...defaults.behavior, ...loaded.behavior },
      ui: { ...defaults.ui, ...loaded.ui },
    };
  }

  private validate(): void {
    if (!this.settings) {
      throw new Error('No settings to validate');
    }

    // Validate trust thresholds
    if (this.settings.policy.trustThresholdForVault < 0 || this.settings.policy.trustThresholdForVault > 1) {
      throw new Error('trustThresholdForVault must be between 0 and 1');
    }

    if (this.settings.policy.trustThresholdForUSB < 0 || this.settings.policy.trustThresholdForUSB > 1) {
      throw new Error('trustThresholdForUSB must be between 0 and 1');
    }

    // Validate max concurrent jobs
    if (this.settings.runtime.maxConcurrentJobs < 1 || this.settings.runtime.maxConcurrentJobs > 10) {
      throw new Error('maxConcurrentJobs must be between 1 and 10');
    }

    // Validate max delivery attempts
    if (this.settings.delivery.maxDeliveryAttempts < 0 || this.settings.delivery.maxDeliveryAttempts > 10) {
      throw new Error('maxDeliveryAttempts must be between 0 and 10');
    }

    // Validate enabled targets have required config
    if (this.settings.targets.usb.enabled && !this.settings.targets.usb.targetValue) {
      throw new Error('USB target enabled but targetValue not set');
    }

    if (this.settings.targets.obsidian.enabled && !this.settings.targets.obsidian.vaultPath) {
      throw new Error('Obsidian target enabled but vaultPath not set');
    }

    if (this.settings.targets.notebook.enabled && !this.settings.targets.notebook.workspacePath) {
      throw new Error('Notebook target enabled but workspacePath not set');
    }

    if (this.settings.targets.notion.enabled && !this.settings.targets.notion.tokenRef) {
      throw new Error('Notion target enabled but tokenRef not set');
    }

    // Validate enabled connectors have required config
    if (this.settings.connectors.github.enabled && this.settings.connectors.github.authMode === 'token' && !this.settings.connectors.github.tokenRef) {
      throw new Error('GitHub connector enabled with token auth but tokenRef not set');
    }

    if (this.settings.connectors.perplexity.enabled && !this.settings.connectors.perplexity.apiKeyRef) {
      throw new Error('Perplexity connector enabled but apiKeyRef not set');
    }
  }

  getSettings(): SourceVaultSettings {
    if (!this.settings) {
      return this.load();
    }
    return this.settings;
  }
}
