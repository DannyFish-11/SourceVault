import { v4 as uuidv4 } from 'uuid';
import { SQLiteAdapter } from '../storage';
import { PushPolicyEngine, DeliveryTarget, EvaluationContext } from '../policy';

export type DeliveryStatus = 'pending' | 'ready' | 'writing' | 'synced' | 'failed' | 'blocked' | 'deferred';

export interface DeliveryJob {
  id: string;
  itemId: string;
  itemType: 'artifact' | 'digest' | 'topic';
  target: DeliveryTarget;
  status: DeliveryStatus;
  payload?: any;
  targetPath?: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface DeliveryAdapter {
  target: DeliveryTarget;
  isConfigured(): Promise<boolean>;
  isAvailable(): Promise<boolean>;
  isEligible(item: any): Promise<boolean>;
  serialize(item: any): Promise<any>;
  deliver(payload: any): Promise<void>;
}

export class DeliveryHarness {
  private storage: SQLiteAdapter;
  private policyEngine: PushPolicyEngine;
  private adapters: Map<DeliveryTarget, DeliveryAdapter>;

  constructor(storage: SQLiteAdapter, policyEngine: PushPolicyEngine) {
    this.storage = storage;
    this.policyEngine = policyEngine;
    this.adapters = new Map();
  }

  registerAdapter(adapter: DeliveryAdapter): void {
    this.adapters.set(adapter.target, adapter);
  }

  async createDeliveryJob(
    itemId: string,
    itemType: 'artifact' | 'digest' | 'topic',
    target: DeliveryTarget,
    context: EvaluationContext
  ): Promise<DeliveryJob | null> {
    // Evaluate push policy
    const decision = await this.policyEngine.evaluate(context, target);

    if (decision.decision === 'block') {
      // Create blocked job for visibility
      const job: DeliveryJob = {
        id: uuidv4(),
        itemId,
        itemType,
        target,
        status: 'blocked',
        attempts: 0,
        maxAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { blockReasons: decision.reasons },
      };

      this.storage.createDeliveryJob(job);
      return job;
    }

    if (decision.decision === 'manual_only') {
      // Create deferred job awaiting manual approval
      const job: DeliveryJob = {
        id: uuidv4(),
        itemId,
        itemType,
        target,
        status: 'deferred',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { deferReasons: decision.reasons },
      };

      this.storage.createDeliveryJob(job);
      return job;
    }

    // Create pending job
    const job: DeliveryJob = {
      id: uuidv4(),
      itemId,
      itemType,
      target,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.storage.createDeliveryJob(job);
    return job;
  }

  async processQueue(): Promise<void> {
    const pendingJobs = this.storage.getDeliveryJobsByStatus('pending');
    const readyJobs = this.storage.getDeliveryJobsByStatus('ready');

    const jobsToProcess = [...pendingJobs, ...readyJobs];

    for (const job of jobsToProcess) {
      await this.processJob(job);
    }
  }

  async processJob(job: DeliveryJob): Promise<void> {
    const adapter = this.adapters.get(job.target);

    if (!adapter) {
      this.storage.updateDeliveryJob(job.id, {
        status: 'failed',
        lastError: `No adapter registered for target: ${job.target}`,
        attempts: job.attempts + 1,
      });
      return;
    }

    try {
      // Check if adapter is configured and available
      const isConfigured = await adapter.isConfigured();
      if (!isConfigured) {
        this.storage.updateDeliveryJob(job.id, {
          status: 'deferred',
          lastError: `Target ${job.target} not configured`,
        });
        return;
      }

      const isAvailable = await adapter.isAvailable();
      if (!isAvailable) {
        this.storage.updateDeliveryJob(job.id, {
          status: 'deferred',
          lastError: `Target ${job.target} not available`,
        });
        return;
      }

      // Get item data
      const item = await this.getItem(job.itemId, job.itemType);
      if (!item) {
        this.storage.updateDeliveryJob(job.id, {
          status: 'failed',
          lastError: `Item not found: ${job.itemId}`,
          attempts: job.attempts + 1,
        });
        return;
      }

      // Check eligibility
      const isEligible = await adapter.isEligible(item);
      if (!isEligible) {
        this.storage.updateDeliveryJob(job.id, {
          status: 'blocked',
          lastError: `Item not eligible for ${job.target}`,
        });
        return;
      }

      // Serialize payload if not already done
      let payload = job.payload;
      if (!payload) {
        payload = await adapter.serialize(item);
        this.storage.updateDeliveryJob(job.id, {
          status: 'ready',
          payload,
        });
      }

      // Mark as writing
      this.storage.updateDeliveryJob(job.id, {
        status: 'writing',
      });

      // Deliver
      await adapter.deliver(payload);

      // Mark as synced
      this.storage.updateDeliveryJob(job.id, {
        status: 'synced',
        syncedAt: new Date(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if we should retry
      if (job.attempts + 1 < job.maxAttempts) {
        this.storage.updateDeliveryJob(job.id, {
          status: 'pending',
          lastError: errorMessage,
          attempts: job.attempts + 1,
        });
      } else {
        this.storage.updateDeliveryJob(job.id, {
          status: 'failed',
          lastError: errorMessage,
          attempts: job.attempts + 1,
        });
      }
    }
  }

  async retryJob(jobId: string): Promise<void> {
    const job = this.storage.getDeliveryJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'failed' && job.status !== 'deferred') {
      throw new Error(`Cannot retry job in status: ${job.status}`);
    }

    this.storage.updateDeliveryJob(jobId, {
      status: 'pending',
      attempts: 0,
      lastError: undefined,
    });

    await this.processJob({ ...job, status: 'pending', attempts: 0 });
  }

  async approveManualJob(jobId: string): Promise<void> {
    const job = this.storage.getDeliveryJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'deferred') {
      throw new Error(`Job is not awaiting approval: ${job.status}`);
    }

    this.storage.updateDeliveryJob(jobId, {
      status: 'pending',
    });

    await this.processJob({ ...job, status: 'pending' });
  }

  private async getItem(itemId: string, itemType: string): Promise<any> {
    switch (itemType) {
      case 'artifact':
        return this.storage.getArtifact(itemId);
      case 'digest':
        // TODO: Implement digest retrieval
        return null;
      case 'topic':
        return this.storage.getTopic(itemId);
      default:
        return null;
    }
  }

  async getJobStats(): Promise<{
    pending: number;
    ready: number;
    writing: number;
    synced: number;
    failed: number;
    blocked: number;
    deferred: number;
  }> {
    const statuses: DeliveryStatus[] = ['pending', 'ready', 'writing', 'synced', 'failed', 'blocked', 'deferred'];
    const stats: any = {};

    for (const status of statuses) {
      const jobs = this.storage.getDeliveryJobsByStatus(status);
      stats[status] = jobs.length;
    }

    return stats;
  }
}
