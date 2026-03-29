import { existsSync } from 'fs';
import { SQLiteAdapter } from '../storage/index.js';
import { v4 as uuidv4 } from 'uuid';

export class USBDetector {
  private storage: SQLiteAdapter;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(storage: SQLiteAdapter) {
    this.storage = storage;
  }

  start(): void {
    // Check USB vault every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkUSBVault();
    }, 30000);

    // Initial check
    this.checkUSBVault();
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  checkUSBVault(): void {
    const settings = this.storage.getAllSettings();
    const usbVaultPath = settings.usbVaultPath;

    if (!usbVaultPath) {
      this.log('info', 'No USB vault path configured');
      this.updateConnectionState(false, undefined);
      return;
    }

    const isConnected = this.isVaultAvailable(usbVaultPath);

    if (isConnected) {
      this.log('info', `USB vault connected: ${usbVaultPath}`);
      this.updateConnectionState(true, usbVaultPath);
    } else {
      this.log('info', `USB vault not found: ${usbVaultPath}`);
      this.updateConnectionState(false, undefined);
    }
  }

  isVaultAvailable(path: string): boolean {
    try {
      // Check if path exists
      if (!existsSync(path)) {
        return false;
      }

      // Check if .sourcevault marker exists
      const markerPath = `${path}/.sourcevault`;
      return existsSync(markerPath);
    } catch (error) {
      this.log('error', 'Error checking USB vault', { error: String(error) });
      return false;
    }
  }

  private updateConnectionState(connected: boolean, path?: string): void {
    const syncState = this.storage.getSyncState();

    // Only update if state changed
    if (syncState.usbConnected !== connected) {
      this.storage.updateSyncState({
        usbConnected: connected,
        usbPath: path,
      });

      if (connected) {
        this.log('info', 'USB vault connected');
      } else {
        this.log('info', 'USB vault disconnected');
      }
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
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
}
