import { SQLiteAdapter } from '../storage/index.js';
import { Exporter } from '../export/index.js';
import { v4 as uuidv4 } from 'uuid';

export class SyncQueue {
  private storage: SQLiteAdapter;
  private exporter: Exporter;
  private processing: boolean = false;

  constructor(storage: SQLiteAdapter, exporter: Exporter) {
    this.storage = storage;
    this.exporter = exporter;
  }

  async processQueue(): Promise<void> {
    if (this.processing) {
      this.log('info', 'Sync already in progress');
      return;
    }

    this.processing = true;

    try {
      // Check if USB is connected
      const syncState = this.storage.getSyncState();

      if (!syncState.usbConnected || !syncState.usbPath) {
        this.log('info', 'USB not connected, queuing exports locally');
        this.processing = false;
        return;
      }

      // Get pending export jobs
      const pendingJobs = this.storage.getPendingExportJobs();

      if (pendingJobs.length === 0) {
        this.log('info', 'No pending exports');
        this.processing = false;
        return;
      }

      this.log('info', `Processing ${pendingJobs.length} pending exports`);

      // Process each job
      let successCount = 0;
      let failCount = 0;

      for (const job of pendingJobs) {
        try {
          // Update job status to processing
          this.storage.updateExportJob(job.id, {
            status: 'processing',
          });

          // Export artifact
          await this.exporter.exportArtifact(job.artifactId, syncState.usbPath);

          // Mark job as completed
          this.storage.updateExportJob(job.id, {
            status: 'completed',
            completedAt: new Date(),
          });

          successCount++;
        } catch (error) {
          this.log('error', `Export failed for job ${job.id}`, { error: String(error) });

          // Check retry count
          const settings = this.storage.getAllSettings();
          const maxRetries = parseInt(settings.maxRetries || '3', 10);

          if (job.retryCount >= maxRetries) {
            // Mark as failed
            this.storage.updateExportJob(job.id, {
              status: 'failed',
              error: String(error),
            });
            failCount++;
          } else {
            // Increment retry count and reset to pending
            this.storage.updateExportJob(job.id, {
              status: 'pending',
              retryCount: job.retryCount + 1,
              error: String(error),
            });
          }
        }
      }

      // Update sync state
      this.storage.updateSyncState({
        lastSyncAt: new Date(),
        pendingExports: this.storage.getPendingExportJobs().length,
        failedExports: this.storage.getFailedExportJobs().length,
        totalExports: syncState.totalExports + successCount,
      });

      this.log('info', `Sync completed: ${successCount} success, ${failCount} failed`);
    } finally {
      this.processing = false;
    }
  }

  async queueExport(artifactId: string): Promise<void> {
    const job = {
      id: uuidv4(),
      artifactId,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
    };

    this.storage.createExportJob(job);

    // Update pending count
    const syncState = this.storage.getSyncState();
    this.storage.updateSyncState({
      pendingExports: syncState.pendingExports + 1,
    });

    this.log('info', `Queued export for artifact: ${artifactId}`);
  }

  async retryFailed(): Promise<void> {
    const failedJobs = this.storage.getFailedExportJobs();

    if (failedJobs.length === 0) {
      this.log('info', 'No failed exports to retry');
      return;
    }

    this.log('info', `Retrying ${failedJobs.length} failed exports`);

    for (const job of failedJobs) {
      this.storage.updateExportJob(job.id, {
        status: 'pending',
        retryCount: 0,
        error: undefined,
      });
    }

    // Update counts
    const syncState = this.storage.getSyncState();
    this.storage.updateSyncState({
      pendingExports: syncState.pendingExports + failedJobs.length,
      failedExports: 0,
    });
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
