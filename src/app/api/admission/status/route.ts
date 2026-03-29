import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage';

export async function GET() {
  try {
    const storage = new SQLiteAdapter();

    const admitted = storage.getAdmissionDecisionsByDecision('admit');
    const review = storage.getAdmissionDecisionsByDecision('review');
    const rejected = storage.getAdmissionDecisionsByDecision('reject');

    storage.close();

    return NextResponse.json({
      stats: {
        admitted: admitted.length,
        review: review.length,
        rejected: rejected.length,
      },
      reviewQueue: review.slice(0, 20),
    });
  } catch (error) {
    console.error('Failed to get admission status:', error);
    return NextResponse.json(
      { error: 'Failed to get admission status' },
      { status: 500 }
    );
  }
}
