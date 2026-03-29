import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage/index.js';

export async function GET() {
  try {
    const storage = new SQLiteAdapter();

    const syncState = storage.getSyncState();
    const settings = storage.getAllSettings();
    const recentLogs = storage.getRecentLogs(20);

    const status = {
      running: true,
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
      recentLogs,
    };

    storage.close();

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get runtime status', message: String(error) },
      { status: 500 }
    );
  }
}
