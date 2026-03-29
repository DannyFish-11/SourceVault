import { NextResponse } from 'next/server';
import { TargetRegistry } from '@/runtime/registry';
import { SettingsLoader } from '@/runtime/settings';
import { SQLiteAdapter } from '@/runtime/storage';
import { CredentialManager } from '@/runtime/credentials';

export async function POST() {
  try {
    const storage = new SQLiteAdapter();
    const settingsLoader = new SettingsLoader();
    const credentialManager = new CredentialManager(storage);
    const targetRegistry = new TargetRegistry(settingsLoader, credentialManager);

    await targetRegistry.initialize();
    await targetRegistry.checkAllAvailability();

    const entries = targetRegistry.getAllEntries();
    const health = targetRegistry.getHealthSummary();

    storage.close();

    return NextResponse.json({
      targets: entries,
      health,
      message: 'Target availability rechecked',
    });
  } catch (error) {
    console.error('Failed to recheck targets:', error);
    return NextResponse.json(
      { error: 'Failed to recheck targets' },
      { status: 500 }
    );
  }
}
