#!/usr/bin/env node
import { SQLiteAdapter } from './storage/index.js';
import { Scheduler } from './scheduler.js';
import { RuntimeStatus } from './status.js';
import { USBDetector } from './usb/detector.js';
import { Exporter } from './export/index.js';
import { SyncQueue } from './sync/index.js';

class Runtime {
  private storage: SQLiteAdapter;
  private scheduler: Scheduler;
  private status: RuntimeStatus;
  private usbDetector: USBDetector;
  private exporter: Exporter;
  private syncQueue: SyncQueue;

  constructor() {
    this.storage = new SQLiteAdapter();
    this.scheduler = new Scheduler(this.storage);
    this.status = new RuntimeStatus(this.storage);
    this.usbDetector = new USBDetector(this.storage);
    this.exporter = new Exporter(this.storage);
    this.syncQueue = new SyncQueue(this.storage, this.exporter);
  }

  start(): void {
    console.log('Starting SourceVault Runtime...');

    // Start USB detection
    this.usbDetector.start();
    this.status.log('info', 'USB detector started');

    // Start scheduler
    this.scheduler.start();
    this.status.log('info', 'Scheduler started');

    // Log runtime status
    const runtimeStatus = this.status.getStatus();
    console.log('Runtime Status:', JSON.stringify(runtimeStatus, null, 2));

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
    });

    process.on('SIGTERM', () => {
      this.stop();
    });

    console.log('SourceVault Runtime is running...');
    console.log('Press Ctrl+C to stop');
  }

  stop(): void {
    console.log('\nStopping SourceVault Runtime...');

    this.scheduler.stop();
    this.status.log('info', 'Scheduler stopped');

    this.usbDetector.stop();
    this.status.log('info', 'USB detector stopped');

    this.storage.close();
    this.status.log('info', 'Storage closed');

    console.log('SourceVault Runtime stopped');
    process.exit(0);
  }

  getStatus(): any {
    return this.status.getStatus();
  }

  async manualSync(): Promise<void> {
    await this.syncQueue.processQueue();
  }
}

// Start runtime if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runtime = new Runtime();
  runtime.start();
}

export { Runtime };
