import cron from 'node-cron';
import { SQLiteAdapter } from './storage/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface Job {
  id: string;
  type: 'search' | 'ingest' | 'digest' | 'export' | 'sync';
  schedule?: string; // cron expression
  handler: () => Promise<void>;
}

export class Scheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private storage: SQLiteAdapter;
  private running: boolean = false;

  constructor(storage: SQLiteAdapter) {
    this.storage = storage;
  }

  start(): void {
    if (this.running) {
      console.log('Scheduler already running');
      return;
    }

    this.running = true;
    this.log('info', 'Scheduler started');

    // Load settings
    const settings = this.storage.getAllSettings();
    const scheduleInterval = parseInt(settings.scheduleInterval || '60', 10);
    const autoSync = settings.autoSync === 'true';

    // Schedule periodic jobs
    this.scheduleJob({
      id: 'periodic-check',
      type: 'search',
      schedule: `*/${scheduleInterval} * * * *`, // Every N minutes
      handler: async () => {
        await this.runPeriodicCheck();
      },
    });

    if (autoSync) {
      this.scheduleJob({
        id: 'auto-sync',
        type: 'sync',
        schedule: '*/5 * * * *', // Every 5 minutes
        handler: async () => {
          await this.runAutoSync();
        },
      });
    }

    this.log('info', `Scheduled jobs: ${this.jobs.size}`);
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Stop all scheduled jobs
    for (const [id, task] of this.jobs.entries()) {
      task.stop();
      this.log('info', `Stopped job: ${id}`);
    }

    this.jobs.clear();
    this.log('info', 'Scheduler stopped');
  }

  scheduleJob(job: Job): void {
    if (!job.schedule) {
      this.log('warn', `Job ${job.id} has no schedule, skipping`);
      return;
    }

    if (this.jobs.has(job.id)) {
      this.log('warn', `Job ${job.id} already scheduled, skipping`);
      return;
    }

    const task = cron.schedule(job.schedule, async () => {
      this.log('info', `Running job: ${job.id} (${job.type})`);
      try {
        await job.handler();
        this.log('info', `Job completed: ${job.id}`);
      } catch (error) {
        this.log('error', `Job failed: ${job.id}`, { error: String(error) });
      }
    });

    this.jobs.set(job.id, task);
    this.log('info', `Scheduled job: ${job.id} (${job.schedule})`);
  }

  async runPeriodicCheck(): Promise<void> {
    this.log('info', 'Running periodic check');

    // This is a placeholder for actual search/ingest logic
    // In a real implementation, this would:
    // 1. Check tracked topics
    // 2. Query sources for new content
    // 3. Ingest new artifacts
    // 4. Create export jobs

    // For now, just log
    const topics = this.storage.getAllTopics();
    this.log('info', `Checked ${topics.length} topics`);
  }

  async runAutoSync(): Promise<void> {
    this.log('info', 'Running auto-sync');

    // Check if USB is connected
    const syncState = this.storage.getSyncState();

    if (!syncState.usbConnected) {
      this.log('info', 'USB not connected, skipping sync');
      return;
    }

    // Get pending export jobs
    const pendingJobs = this.storage.getPendingExportJobs();

    if (pendingJobs.length === 0) {
      this.log('info', 'No pending exports');
      return;
    }

    this.log('info', `Found ${pendingJobs.length} pending exports`);

    // Sync will be handled by sync module
    // This is just a trigger point
  }

  isRunning(): boolean {
    return this.running;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const log = {
      id: uuidv4(),
      level,
      message,
      timestamp: new Date(),
      metadata,
    };

    this.storage.createLog(log);
    console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
  }
}
