# Runtime Status Specification

## Purpose

Runtime status is the minimal observable state of the SourceVault Local system.

It exists so the control UI can answer:
- is the runtime alive
- is USB connected
- is syncing healthy
- how many items are queued
- when did it last run
- when did it last sync

## Status object

```ts
type RuntimeStatus = {
  state: 'idle' | 'running' | 'syncing' | 'degraded' | 'error'

  startedAt?: string
  lastRunAt?: string
  lastSyncAt?: string
  lastSuccessfulSyncAt?: string

  queueLength: number
  failedJobs: number
  deferredJobs: number

  usbConnected: boolean
  usbTargetMode: 'path' | 'volumeName'
  usbTargetValue?: string

  trackedTopics: number
  activeConnectors: Array<'github' | 'arxiv' | 'perplexity'>

  lastError?: string
}
```

## State meanings

### idle
Runtime is started but not actively processing a job.

### running
Runtime is executing scheduled work or collection jobs.

### syncing
Runtime is currently writing queued exports to the USB vault.

### degraded
Runtime is alive but impaired.
Examples:
- USB missing
- queue backlog too large
- connector temporarily unavailable
- some sync jobs failing

### error
Runtime is not healthy enough to continue normal operation without intervention.

## Minimum UI exposure

The current web control surface should display:
- runtime state
- USB connected / disconnected
- queue length
- failed jobs count
- last run time
- last sync time
- active connectors
- manual sync action

## Update rules

Runtime status should be updated when:
- runtime starts
- runtime stops
- scheduled cycle begins
- scheduled cycle ends
- USB becomes available
- USB disconnects
- sync starts
- sync succeeds
- sync fails
- queue changes materially

## Logging relationship

Runtime status is summary state.
Logs are detailed event records.
Status should remain compact.
Logs should preserve fine-grained details.

## Health thresholds

A runtime may enter degraded state when:
- queueLength exceeds configured threshold
- failedJobs exceeds configured threshold
- USB is missing for extended time while pending sync exists
- one or more connectors repeatedly fail

A runtime may enter error state when:
- startup failed
- storage is unavailable
- queue cannot be read
- fatal sync logic breaks
- settings are invalid and cannot be resolved

## API suggestion

The control UI may expose status through endpoints like:
- GET /api/runtime-status
- POST /api/manual-sync
- GET /api/queue
- GET /api/settings

## Final principle

Runtime status should be calm, compact, and operational.
It is not decorative telemetry.
It exists to support trust, intervention, and reliability.
