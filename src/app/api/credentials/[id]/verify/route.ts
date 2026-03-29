import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage';
import { CredentialManager } from '@/runtime/credentials';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const storage = new SQLiteAdapter();
    const credentialManager = new CredentialManager(storage);

    const isValid = await credentialManager.verifyCredential(id);

    storage.close();

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('Failed to verify credential:', error);
    return NextResponse.json(
      { error: 'Failed to verify credential' },
      { status: 500 }
    );
  }
}
