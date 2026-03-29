import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage';
import { CredentialManager } from '@/runtime/credentials';

export async function GET() {
  try {
    const storage = new SQLiteAdapter();
    const credentialManager = new CredentialManager(storage);

    // Get all credentials (without sensitive values)
    const credentials = storage.getCredentialsByTarget('');

    // Group by target
    const grouped: Record<string, any[]> = {};
    for (const cred of credentials) {
      if (!grouped[cred.target]) {
        grouped[cred.target] = [];
      }
      grouped[cred.target].push({
        id: cred.id,
        target: cred.target,
        authType: cred.authType,
        label: cred.label,
        status: cred.status,
        createdAt: cred.createdAt,
        lastVerifiedAt: cred.lastVerifiedAt,
        expiresAt: cred.expiresAt,
      });
    }

    storage.close();

    return NextResponse.json({ credentials: grouped });
  } catch (error) {
    console.error('Failed to get credentials:', error);
    return NextResponse.json(
      { error: 'Failed to get credentials' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { target, authType, label, value, expiresAt } = body;

    if (!target || !authType || !label || !value) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const storage = new SQLiteAdapter();
    const credentialManager = new CredentialManager(storage);

    const credential = await credentialManager.createCredential({
      target,
      authType,
      label,
      value,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    // Verify the credential
    const isValid = await credentialManager.verifyCredential(credential.id);

    storage.close();

    return NextResponse.json({
      credential: {
        id: credential.id,
        target: credential.target,
        authType: credential.authType,
        label: credential.label,
        status: isValid ? 'valid' : 'invalid',
        createdAt: credential.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to create credential:', error);
    return NextResponse.json(
      { error: 'Failed to create credential' },
      { status: 500 }
    );
  }
}
