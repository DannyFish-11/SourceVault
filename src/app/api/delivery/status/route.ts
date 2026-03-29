import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage';

export async function GET() {
  try {
    const storage = new SQLiteAdapter();

    const stats = {
      pending: storage.getDeliveryJobsByStatus('pending').length,
      ready: storage.getDeliveryJobsByStatus('ready').length,
      writing: storage.getDeliveryJobsByStatus('writing').length,
      synced: storage.getDeliveryJobsByStatus('synced').length,
      failed: storage.getDeliveryJobsByStatus('failed').length,
      blocked: storage.getDeliveryJobsByStatus('blocked').length,
      deferred: storage.getDeliveryJobsByStatus('deferred').length,
    };

    // Get recent jobs
    const recentJobs = [
      ...storage.getDeliveryJobsByStatus('pending').slice(0, 10),
      ...storage.getDeliveryJobsByStatus('failed').slice(0, 10),
      ...storage.getDeliveryJobsByStatus('deferred').slice(0, 10),
    ];

    storage.close();

    return NextResponse.json({ stats, recentJobs });
  } catch (error) {
    console.error('Failed to get delivery status:', error);
    return NextResponse.json(
      { error: 'Failed to get delivery status' },
      { status: 500 }
    );
  }
}
