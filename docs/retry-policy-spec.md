# SourceVault Retry Policy Specification

## Purpose

Retry policy controls how SourceVault responds when delivery or sync fails.

It exists to:
- avoid silent loss
- keep automation resilient
- prevent endless failing loops
- distinguish temporary failure from permanent misconfiguration

## Core principle

Retries should be calm and deliberate.

The system should:
- retry transient failures
- stop retrying obvious permanent failures until changed
- preserve clear logs
- allow manual retry

## Retryable failure categories

Typical retryable failures:
- USB temporarily disconnected
- remote API temporary outage
- network timeout
- rate limit cooldown
- file lock contention
- temporary path unavailability

## Non-retryable or pause-until-fixed categories

Typical non-retryable states:
- invalid credentials
- missing required config
- blocked domain
- malformed payload
- target explicitly disabled
- permanent path not found

## Retry strategy model

```ts
type RetryStrategy = {
  maxAttempts: number
  backoffMode: 'linear' | 'exponential' | 'fixed'
  initialDelayMs: number
  maxDelayMs: number
  resetAfterSuccess: boolean
}
```

## Default retry strategies

### Delivery jobs
- maxAttempts: 3
- backoffMode: exponential
- initialDelayMs: 5000
- maxDelayMs: 300000
- resetAfterSuccess: true

### Connector queries
- maxAttempts: 2
- backoffMode: fixed
- initialDelayMs: 10000
- maxDelayMs: 10000
- resetAfterSuccess: true

### Target availability checks
- maxAttempts: 1
- backoffMode: fixed
- initialDelayMs: 0
- maxDelayMs: 0
- resetAfterSuccess: false

## Failure classification

The retry system should classify failures:

### transient
Retry automatically with backoff.

Examples:
- network timeout
- rate limit
- temporary unavailability

### configuration
Do not retry automatically. Mark as blocked until config changes.

Examples:
- missing credential
- invalid path
- disabled target

### permanent
Do not retry. Mark as failed.

Examples:
- malformed data
- blocked domain
- explicit rejection

## Retry state model

```ts
type RetryState = {
  jobId: string
  attempts: number
  maxAttempts: number
  lastAttemptAt: string
  nextAttemptAt?: string
  lastError: string
  failureCategory: 'transient' | 'configuration' | 'permanent'
  manualRetryAllowed: boolean
}
```

## Backoff calculation

### Linear
```
delay = initialDelay + (attempts * step)
```

### Exponential
```
delay = min(initialDelay * (2 ^ attempts), maxDelay)
```

### Fixed
```
delay = initialDelay
```

## Manual retry rules

Manual retry should be allowed when:
- job is in failed state
- job is in deferred state
- job has not exceeded absolute max attempts (e.g., 10)

Manual retry should reset:
- attempt counter
- failure category (re-evaluate)
- next attempt time

## Logging requirements

Every retry attempt should log:
- job id
- attempt number
- failure reason
- next retry time
- failure category

## UI exposure

The control surface should show:
- jobs awaiting retry
- jobs blocked by config
- jobs permanently failed
- manual retry action

## Final principle

Retry policy should make SourceVault robust without making it noisy or reckless.
