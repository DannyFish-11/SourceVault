import { NextResponse } from 'next/server';
import { SQLiteAdapter } from '@/runtime/storage/index.js';

export async function GET() {
  try {
    const storage = new SQLiteAdapter();
    const settings = storage.getAllSettings();
    storage.close();

    return NextResponse.json({
      usbVaultPath: settings.usbVaultPath || '',
      usbVaultName: settings.usbVaultName || '',
      scheduleInterval: parseInt(settings.scheduleInterval || '60', 10),
      autoSync: settings.autoSync === 'true',
      maxRetries: parseInt(settings.maxRetries || '3', 10),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get settings', message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storage = new SQLiteAdapter();

    if (body.usbVaultPath !== undefined) {
      storage.setSetting('usbVaultPath', body.usbVaultPath);
    }
    if (body.usbVaultName !== undefined) {
      storage.setSetting('usbVaultName', body.usbVaultName);
    }
    if (body.scheduleInterval !== undefined) {
      storage.setSetting('scheduleInterval', String(body.scheduleInterval));
    }
    if (body.autoSync !== undefined) {
      storage.setSetting('autoSync', String(body.autoSync));
    }
    if (body.maxRetries !== undefined) {
      storage.setSetting('maxRetries', String(body.maxRetries));
    }

    const settings = storage.getAllSettings();
    storage.close();

    return NextResponse.json({
      success: true,
      message: 'Settings updated',
      settings: {
        usbVaultPath: settings.usbVaultPath || '',
        usbVaultName: settings.usbVaultName || '',
        scheduleInterval: parseInt(settings.scheduleInterval || '60', 10),
        autoSync: settings.autoSync === 'true',
        maxRetries: parseInt(settings.maxRetries || '3', 10),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update settings', message: String(error) },
      { status: 500 }
    );
  }
}
