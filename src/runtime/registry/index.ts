import { DeliveryAdapter, DeliveryTarget } from '../delivery';
import { SettingsLoader, TargetSettings } from '../settings';
import { CredentialManager } from '../credentials';
import { RawVaultAdapter } from '../delivery/adapters/raw';
import { USBVaultAdapter } from '../delivery/adapters/usb';
import { ObsidianAdapter } from '../delivery/adapters/obsidian';
import { NotebookAdapter } from '../delivery/adapters/notebook';
import { NotionAdapter } from '../delivery/adapters/notion';

export interface TargetRegistryEntry {
  id: string;
  target: DeliveryTarget;
  enabled: boolean;
  configured: boolean;
  available: boolean;
  adapterName: string;
  mode: 'local' | 'remote';
  lastCheckedAt?: Date;
  lastError?: string;
}

export class TargetRegistry {
  private entries: Map<DeliveryTarget, TargetRegistryEntry>;
  private adapters: Map<DeliveryTarget, DeliveryAdapter>;
  private settingsLoader: SettingsLoader;
  private credentialManager: CredentialManager;

  constructor(settingsLoader: SettingsLoader, credentialManager: CredentialManager) {
    this.entries = new Map();
    this.adapters = new Map();
    this.settingsLoader = settingsLoader;
    this.credentialManager = credentialManager;
  }

  async initialize(): Promise<void> {
    const settings = this.settingsLoader.getSettings();
    await this.buildRegistry(settings.targets);
    await this.checkAllAvailability();
  }

  private async buildRegistry(targets: TargetSettings): Promise<void> {
    // Raw vault
    const rawEntry: TargetRegistryEntry = {
      id: 'raw',
      target: 'raw',
      enabled: targets.raw.enabled,
      configured: true,
      available: false,
      adapterName: 'RawVaultAdapter',
      mode: 'local',
    };
    this.entries.set('raw', rawEntry);

    if (targets.raw.enabled) {
      const settings = this.settingsLoader.getSettings();
      const adapter = new RawVaultAdapter(settings.storage.localVaultPath);
      this.adapters.set('raw', adapter);
    }

    // USB vault
    const usbEntry: TargetRegistryEntry = {
      id: 'usb',
      target: 'usb',
      enabled: targets.usb.enabled,
      configured: targets.usb.enabled && targets.usb.targetValue !== '',
      available: false,
      adapterName: 'USBVaultAdapter',
      mode: 'local',
    };
    this.entries.set('usb', usbEntry);

    if (targets.usb.enabled && targets.usb.targetValue) {
      const adapter = new USBVaultAdapter(targets.usb.targetValue);
      this.adapters.set('usb', adapter);
    }

    // Obsidian
    const obsidianEntry: TargetRegistryEntry = {
      id: 'obsidian',
      target: 'obsidian',
      enabled: targets.obsidian.enabled,
      configured: targets.obsidian.enabled && targets.obsidian.vaultPath !== '',
      available: false,
      adapterName: 'ObsidianAdapter',
      mode: 'local',
    };
    this.entries.set('obsidian', obsidianEntry);

    if (targets.obsidian.enabled && targets.obsidian.vaultPath) {
      const adapter = new ObsidianAdapter(targets.obsidian.vaultPath);
      this.adapters.set('obsidian', adapter);
    }

    // Notebook
    const notebookEntry: TargetRegistryEntry = {
      id: 'notebook',
      target: 'notebook',
      enabled: targets.notebook.enabled,
      configured: targets.notebook.enabled && targets.notebook.workspacePath !== '',
      available: false,
      adapterName: 'NotebookAdapter',
      mode: 'local',
    };
    this.entries.set('notebook', notebookEntry);

    if (targets.notebook.enabled && targets.notebook.workspacePath) {
      // Notebook adapter needs API endpoint and key
      // For now, use workspace path as endpoint
      const adapter = new NotebookAdapter(targets.notebook.workspacePath, '');
      this.adapters.set('notebook', adapter);
    }

    // Notion
    const notionEntry: TargetRegistryEntry = {
      id: 'notion',
      target: 'notion',
      enabled: targets.notion.enabled,
      configured: targets.notion.enabled && targets.notion.tokenRef !== undefined,
      available: false,
      adapterName: 'NotionAdapter',
      mode: 'remote',
    };
    this.entries.set('notion', notionEntry);

    if (targets.notion.enabled && targets.notion.tokenRef) {
      const token = this.settingsLoader.resolveSecret(targets.notion.tokenRef);
      if (token && targets.notion.artifactsDatabaseId) {
        const adapter = new NotionAdapter(token, targets.notion.artifactsDatabaseId);
        this.adapters.set('notion', adapter);
      }
    }
  }

  async checkAllAvailability(): Promise<void> {
    for (const [target, entry] of this.entries) {
      if (!entry.enabled || !entry.configured) {
        continue;
      }

      await this.checkAvailability(target);
    }
  }

  async checkAvailability(target: DeliveryTarget): Promise<boolean> {
    const entry = this.entries.get(target);
    if (!entry) {
      return false;
    }

    const adapter = this.adapters.get(target);
    if (!adapter) {
      entry.available = false;
      entry.lastError = 'No adapter registered';
      entry.lastCheckedAt = new Date();
      return false;
    }

    try {
      const isConfigured = await adapter.isConfigured();
      if (!isConfigured) {
        entry.available = false;
        entry.configured = false;
        entry.lastError = 'Not configured';
        entry.lastCheckedAt = new Date();
        return false;
      }

      const isAvailable = await adapter.isAvailable();
      entry.available = isAvailable;
      entry.configured = true;
      entry.lastError = isAvailable ? undefined : 'Not available';
      entry.lastCheckedAt = new Date();

      return isAvailable;
    } catch (error) {
      entry.available = false;
      entry.lastError = error instanceof Error ? error.message : 'Unknown error';
      entry.lastCheckedAt = new Date();
      return false;
    }
  }

  getEntry(target: DeliveryTarget): TargetRegistryEntry | null {
    return this.entries.get(target) || null;
  }

  getAllEntries(): TargetRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getEnabledTargets(): DeliveryTarget[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.enabled)
      .map(entry => entry.target);
  }

  getAvailableTargets(): DeliveryTarget[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.enabled && entry.configured && entry.available)
      .map(entry => entry.target);
  }

  getAdapter(target: DeliveryTarget): DeliveryAdapter | null {
    return this.adapters.get(target) || null;
  }

  isTargetAvailable(target: DeliveryTarget): boolean {
    const entry = this.entries.get(target);
    return entry ? entry.enabled && entry.configured && entry.available : false;
  }

  async reload(): Promise<void> {
    this.entries.clear();
    this.adapters.clear();
    await this.initialize();
  }

  getHealthSummary(): {
    total: number;
    enabled: number;
    configured: number;
    available: number;
    unavailable: number;
  } {
    const entries = Array.from(this.entries.values());

    return {
      total: entries.length,
      enabled: entries.filter(e => e.enabled).length,
      configured: entries.filter(e => e.configured).length,
      available: entries.filter(e => e.available).length,
      unavailable: entries.filter(e => e.enabled && !e.available).length,
    };
  }
}
