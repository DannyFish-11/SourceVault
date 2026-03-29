export type BackoffMode = 'linear' | 'exponential' | 'fixed';
export type FailureCategory = 'transient' | 'configuration' | 'permanent';

export interface RetryStrategy {
  maxAttempts: number;
  backoffMode: BackoffMode;
  initialDelayMs: number;
  maxDelayMs: number;
  resetAfterSuccess: boolean;
}

export interface RetryState {
  jobId: string;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: Date;
  nextAttemptAt?: Date;
  lastError: string;
  failureCategory: FailureCategory;
  manualRetryAllowed: boolean;
}

export class RetryPolicy {
  private strategies: Map<string, RetryStrategy>;

  constructor() {
    this.strategies = new Map();
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies(): void {
    // Delivery jobs
    this.strategies.set('delivery', {
      maxAttempts: 3,
      backoffMode: 'exponential',
      initialDelayMs: 5000,
      maxDelayMs: 300000,
      resetAfterSuccess: true,
    });

    // Connector queries
    this.strategies.set('connector', {
      maxAttempts: 2,
      backoffMode: 'fixed',
      initialDelayMs: 10000,
      maxDelayMs: 10000,
      resetAfterSuccess: true,
    });

    // Target availability checks
    this.strategies.set('availability', {
      maxAttempts: 1,
      backoffMode: 'fixed',
      initialDelayMs: 0,
      maxDelayMs: 0,
      resetAfterSuccess: false,
    });
  }

  getStrategy(type: string): RetryStrategy {
    return this.strategies.get(type) || this.strategies.get('delivery')!;
  }

  setStrategy(type: string, strategy: RetryStrategy): void {
    this.strategies.set(type, strategy);
  }

  calculateNextAttemptTime(
    attempts: number,
    strategy: RetryStrategy
  ): Date {
    const delay = this.calculateDelay(attempts, strategy);
    return new Date(Date.now() + delay);
  }

  private calculateDelay(attempts: number, strategy: RetryStrategy): number {
    switch (strategy.backoffMode) {
      case 'linear':
        return Math.min(
          strategy.initialDelayMs + attempts * strategy.initialDelayMs,
          strategy.maxDelayMs
        );

      case 'exponential':
        return Math.min(
          strategy.initialDelayMs * Math.pow(2, attempts),
          strategy.maxDelayMs
        );

      case 'fixed':
        return strategy.initialDelayMs;

      default:
        return strategy.initialDelayMs;
    }
  }

  classifyFailure(error: Error | string): FailureCategory {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerError = errorMessage.toLowerCase();

    // Configuration errors
    if (
      lowerError.includes('not configured') ||
      lowerError.includes('missing credential') ||
      lowerError.includes('invalid path') ||
      lowerError.includes('disabled target') ||
      lowerError.includes('no adapter')
    ) {
      return 'configuration';
    }

    // Permanent errors
    if (
      lowerError.includes('malformed') ||
      lowerError.includes('blocked domain') ||
      lowerError.includes('rejected') ||
      lowerError.includes('forbidden') ||
      lowerError.includes('unauthorized')
    ) {
      return 'permanent';
    }

    // Transient errors (default)
    return 'transient';
  }

  shouldRetry(state: RetryState, strategy: RetryStrategy): boolean {
    // Don't retry if max attempts reached
    if (state.attempts >= strategy.maxAttempts) {
      return false;
    }

    // Don't retry configuration errors automatically
    if (state.failureCategory === 'configuration') {
      return false;
    }

    // Don't retry permanent errors
    if (state.failureCategory === 'permanent') {
      return false;
    }

    // Retry transient errors
    return state.failureCategory === 'transient';
  }

  canManualRetry(state: RetryState): boolean {
    // Allow manual retry if not exceeded absolute max
    const absoluteMax = 10;
    return state.attempts < absoluteMax;
  }

  createRetryState(
    jobId: string,
    error: Error | string,
    strategy: RetryStrategy,
    currentAttempts: number = 0
  ): RetryState {
    const failureCategory = this.classifyFailure(error);
    const errorMessage = typeof error === 'string' ? error : error.message;

    const state: RetryState = {
      jobId,
      attempts: currentAttempts + 1,
      maxAttempts: strategy.maxAttempts,
      lastAttemptAt: new Date(),
      lastError: errorMessage,
      failureCategory,
      manualRetryAllowed: true,
    };

    if (this.shouldRetry(state, strategy)) {
      state.nextAttemptAt = this.calculateNextAttemptTime(state.attempts, strategy);
    }

    return state;
  }

  resetRetryState(state: RetryState): RetryState {
    return {
      ...state,
      attempts: 0,
      nextAttemptAt: undefined,
      lastError: '',
    };
  }

  isRetryDue(state: RetryState): boolean {
    if (!state.nextAttemptAt) {
      return false;
    }

    return new Date() >= state.nextAttemptAt;
  }

  getRetryStats(states: RetryState[]): {
    total: number;
    pending: number;
    transient: number;
    configuration: number;
    permanent: number;
    retryable: number;
  } {
    return {
      total: states.length,
      pending: states.filter(s => s.nextAttemptAt && !this.isRetryDue(s)).length,
      transient: states.filter(s => s.failureCategory === 'transient').length,
      configuration: states.filter(s => s.failureCategory === 'configuration').length,
      permanent: states.filter(s => s.failureCategory === 'permanent').length,
      retryable: states.filter(s => s.nextAttemptAt && this.isRetryDue(s)).length,
    };
  }
}
