#!/usr/bin/env node
import { SyncQueue } from './index.js';
import { SQLiteAdapter } from '../storage/index.js';
import { Exporter } from '../export/index.js';

async function main() {
  console.log('Starting manual sync...');

  const storage = new SQLiteAdapter();
  const exporter = new Exporter(storage);
  const syncQueue = new SyncQueue(storage, exporter);

  try {
    await syncQueue.processQueue();
    console.log('Manual sync completed');
  } catch (error) {
    console.error('Manual sync failed:', error);
    process.exit(1);
  } finally {
    storage.close();
  }
}

main();
