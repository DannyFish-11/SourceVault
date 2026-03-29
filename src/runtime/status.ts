import { SQLiteAdapter } from './storage/index.js';
import { v4 as uuidv4 } from 'uuid';

export class RuntimeStatus {
  private storage: SQLiteAdapter;
  private startTime: Date;

  constructor(storage: SQLiteAdapter) {
    this.storage = storage;
    this.startTime = new Date();
  }

  getStatus(): any {
    const syncState = this.storage.getSyncState();
    const settings = this.storage.getAllSettings();

    return {
      running: true,
      startTime: this.startTime,
      lastCheck: new Date(),
      syncState: {
        id: syncState.id,
        lastSyncAt: syncState.lastSyncAt,
        usbConnected: syncState.usbConnected,
        usbPath: syncState.usbPath,
        pendingExports: syncState.pendingExports,
        failedExports: syncState.failedExports,
        totalExports: syncState.totalExports,
      },
      settings: {
        usbVaultPath: settings.usbVaultPath,
        usbVaultName: settings.usbVaultName,
        scheduleInterval: parseInt(settings.scheduleInterval || '60', 10),
        autoSync: settings.autoSync === 'true',
        maxRetries: parseInt(settings.maxRetries || '3', 10),
      },
    };
  }

  updateSyncState(updates: any): void {
    this.storage.updateSyncState(updates);
  }

  log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const log = {
      id: uuidv4(),
      level,
      message,
      timestamp: new Date(),
      metadata,
    };

    this.storage.createLog(log);
    console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
  }

  getRecentLogs(limit: number = 50): any[] {
    return this.storage.getRecentLogs(limit);
  }
}
