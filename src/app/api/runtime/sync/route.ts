import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage/index.js';
import { Exporter } from '@/runtime/export/index.js';
import { SyncQueue } from '@/runtime/sync/index.js';

export async function POST() {
  try {
    const storage = new SQLiteAdapter();
    const exporter = new Exporter(storage);
    const syncQueue = new SyncQueue(storage, exporter);

    await syncQueue.processQueue();

    const syncState = storage.getSyncState();
    storage.close();

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      syncState: {
        lastSyncAt: syncState.lastSyncAt,
        pendingExports: syncState.pendingExports,
        failedExports: syncState.failedExports,
        totalExports: syncState.totalExports,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Sync failed', message: String(error) },
      { status: 500 }
    );
  }
}
