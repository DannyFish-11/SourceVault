import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage';
import { VaultAdmissionEngine } from '@/runtime/admission';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    const storage = new SQLiteAdapter();
    const policyMode = storage.getSetting('policyMode') as 'strict' | 'balanced' | 'broad' || 'strict';
    const trustThreshold = parseFloat(storage.getSetting('trustThreshold') || '0.7');

    const admissionEngine = new VaultAdmissionEngine(storage, policyMode, trustThreshold);

    await admissionEngine.rejectReviewItem(id, reason);

    storage.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reject review item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject item' },
      { status: 500 }
    );
  }
}
