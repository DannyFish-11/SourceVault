import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage';
import { DeliveryHarness } from '@/runtime/delivery';
import { PushPolicyEngine } from '@/runtime/policy';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const storage = new SQLiteAdapter();
    const policyEngine = new PushPolicyEngine(storage);
    const harness = new DeliveryHarness(storage, policyEngine);

    await harness.approveManualJob(id);

    storage.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to approve delivery job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve job' },
      { status: 500 }
    );
  }
}
