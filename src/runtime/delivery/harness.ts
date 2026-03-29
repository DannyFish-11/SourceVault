import { v4 as uuidv4 } from 'uuid';
import { SQLiteAdapter } from '../storage';
import { PushPolicyEngine, DeliveryTarget, EvaluationContext } from '../policy';
import { TargetRegistry } from '../registry';
import { RetryPolicy, RetryState } from '../retry';

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
  private targetRegistry: TargetRegistry;
  private retryPolicy: RetryPolicy;

  constructor(
    storage: SQLiteAdapter,
    policyEngine: PushPolicyEngine,
    targetRegistry: TargetRegistry,
    retryPolicy: RetryPolicy
  ) {
    this.storage = storage;
    this.policyEngine = policyEngine;
    this.targetRegistry = targetRegistry;
    this.retryPolicy = retryPolicy;
  }

  async createDeliveryJob(
    itemId: string,
    itemType: 'artifact' | 'digest' | 'topic',
    target: DeliveryTarget,
    context: EvaluationContext
  ): Promise<DeliveryJob | null> {
    // Check if target is available
    if (!this.targetRegistry.isTargetAvailable(target)) {
      const entry = this.targetRegistry.getEntry(target);
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
        lastError: entry?.lastError || 'Target not available',
        metadata: { targetUnavailable: true },
      };

      this.storage.createDeliveryJob(job);
      return job;
    }

    // Evaluate push policy
    const decision = await this.policyEngine.evaluate(context, target);

    if (decision.decision === 'block') {
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
    const strategy = this.retryPolicy.getStrategy('delivery');
    const job: DeliveryJob = {
      id: uuidv4(),
      itemId,
      itemType,
      target,
      status: 'pending',
      attempts: 0,
      maxAttempts: strategy.maxAttempts,
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
    const adapter = this.targetRegistry.getAdapter(job.target);

    if (!adapter) {
      const strategy = this.retryPolicy.getStrategy('delivery');
      const retryState = this.retryPolicy.createRetryState(
        job.id,
        `No adapter registered for target: ${job.target}`,
        strategy,
        job.attempts
      );

      this.storage.updateDeliveryJob(job.id, {
        status: retryState.failureCategory === 'configuration' ? 'deferred' : 'failed',
        lastError: retryState.lastError,
        attempts: retryState.attempts,
      });
      return;
    }

    try {
      // Check if target is still available
      const isAvailable = await this.targetRegistry.checkAvailability(job.target);
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
        const strategy = this.retryPolicy.getStrategy('delivery');
        const retryState = this.retryPolicy.createRetryState(
          job.id,
          `Item not found: ${job.itemId}`,
          strategy,
          job.attempts
        );

        this.storage.updateDeliveryJob(job.id, {
          status: 'failed',
          lastError: retryState.lastError,
          attempts: retryState.attempts,
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
      const strategy = this.retryPolicy.getStrategy('delivery');
      const retryState = this.retryPolicy.createRetryState(
        job.id,
        error instanceof Error ? error : new Error('Unknown error'),
        strategy,
        job.attempts
      );

      // Check if we should retry
      if (this.retryPolicy.shouldRetry(retryState, strategy)) {
        this.storage.updateDeliveryJob(job.id, {
          status: 'pending',
          lastError: retryState.lastError,
          attempts: retryState.attempts,
          metadata: {
            ...job.metadata,
            nextRetryAt: retryState.nextAttemptAt?.toISOString(),
          },
        });
      } else {
        const finalStatus = retryState.failureCategory === 'configuration' ? 'deferred' : 'failed';
        this.storage.updateDeliveryJob(job.id, {
          status: finalStatus,
          lastError: retryState.lastError,
          attempts: retryState.attempts,
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

    const strategy = this.retryPolicy.getStrategy('delivery');
    const retryState: RetryState = {
      jobId: job.id,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastAttemptAt: new Date(job.updatedAt),
      lastError: job.lastError || '',
      failureCategory: 'transient',
      manualRetryAllowed: true,
    };

    if (!this.retryPolicy.canManualRetry(retryState)) {
      throw new Error('Maximum retry attempts exceeded');
    }

    this.storage.updateDeliveryJob(jobId, {
      status: 'pending',
      attempts: 0,
      lastError: undefined,
      metadata: {
        ...job.metadata,
        manualRetry: true,
      },
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
      metadata: {
        ...job.metadata,
        manuallyApproved: true,
      },
    });

    await this.processJob({ ...job, status: 'pending' });
  }

  private async getItem(itemId: string, itemType: string): Promise<any> {
    switch (itemType) {
      case 'artifact':
        return this.storage.getArtifact(itemId);
      case 'digest':
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
