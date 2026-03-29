import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage';
import { CredentialManager } from '@/runtime/credentials';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const storage = new SQLiteAdapter();
    const credentialManager = new CredentialManager(storage);

    await credentialManager.deleteCredential(id);

    storage.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete credential:', error);
    return NextResponse.json(
      { error: 'Failed to delete credential' },
      { status: 500 }
    );
  }
}
