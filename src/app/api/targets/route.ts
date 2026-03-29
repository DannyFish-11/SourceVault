import { NextResponse } from 'next/server';
import { TargetRegistry } from '@/runtime/registry';
import { SettingsLoader } from '@/runtime/settings';
import { SQLiteAdapter } from '@/runtime/storage';
import { CredentialManager } from '@/runtime/credentials';

export async function GET() {
  try {
    const storage = new SQLiteAdapter();
    const settingsLoader = new SettingsLoader();
    const credentialManager = new CredentialManager(storage);
    const targetRegistry = new TargetRegistry(settingsLoader, credentialManager);

    await targetRegistry.initialize();

    const entries = targetRegistry.getAllEntries();
    const health = targetRegistry.getHealthSummary();

    storage.close();

    return NextResponse.json({
      targets: entries,
      health,
    });
  } catch (error) {
    console.error('Failed to get targets:', error);
    return NextResponse.json(
      { error: 'Failed to get targets' },
      { status: 500 }
    );
  }
}
