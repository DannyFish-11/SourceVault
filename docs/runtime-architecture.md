# SourceVault Runtime Architecture

## Purpose

SourceVault is no longer just a web MVP.
It is evolving into a local-first background research system that continuously collects, stores, exports, and syncs source-first information.

The web UI is a control surface.
The runtime is the product core.

## System goal

The runtime must:
- start locally
- run safely in the background
- track configured topics and searches
- persist results locally
- queue exports
- detect a designated USB vault
- sync pending results automatically when the USB vault is available
- never lose data silently
- keep provenance and timestamps for every exported item

## High-level architecture

SourceVault runtime is composed of 5 layers:

1. Control surface layer
2. Runtime daemon layer
3. Local vault layer
4. Export and sync layer
5. USB vault layer

## 1. Control surface layer

This is the existing web UI.

Responsibilities:
- show runtime status
- show queue length
- show last sync time
- show USB connected / disconnected status
- configure tracked topics
- configure sync schedule
- configure designated USB vault target
- trigger manual sync
- inspect logs and failed jobs

Non-responsibilities:
- long-running background work
- direct sync logic
- direct scheduling logic
- direct file export logic

The web UI must remain thin.
It should observe and control the runtime, not become the runtime.

## 2. Runtime daemon layer

This is the background engine.

Responsibilities:
- start and maintain internal services
- run scheduled jobs
- trigger search / collection / monitoring tasks
- create local records
- generate export jobs
- monitor sync queue
- detect USB availability
- attempt sync when conditions are met
- publish runtime state

Key modules:
- daemon.ts
- scheduler.ts
- job-runner.ts
- status.ts
- logger.ts
- event-bus.ts

### daemon.ts
Main runtime entry point.
Starts scheduler, queue processor, USB monitor, and state publisher.

### scheduler.ts
Schedules recurring jobs:
- topic refresh
- digest generation
- queue retry
- USB availability checks

### job-runner.ts
Executes specific units of work with clear boundaries.
Examples:
- refreshTopicJob
- buildDigestJob
- createExportJob
- syncPendingJobsJob

### status.ts
Maintains observable runtime status:
- running / idle / syncing / degraded / error
- queue length
- last run time
- last sync time
- USB availability
- recent errors

### logger.ts
Provides structured logs for:
- runtime start
- job start / success / failure
- USB connected / disconnected
- export created
- sync completed
- retry attempts

### event-bus.ts
Optional internal message layer for decoupling:
- RESULT_INGESTED
- EXPORT_JOB_CREATED
- USB_CONNECTED
- USB_DISCONNECTED
- SYNC_COMPLETED
- SYNC_FAILED

## 3. Local vault layer

The local vault is the system of record when USB is unavailable.
The USB vault is a synchronized external target, not the only source of truth.

Responsibilities:
- persist all core entities locally
- preserve queue state
- retain sync metadata
- support retries and recovery
- make the system resilient when removable storage is absent

Core entities:
- Topic
- Source
- Artifact
- Event
- Digest
- ExportJob
- UsbVault
- RuntimeState
- Settings

Recommended storage strategy for first version:
- structured local files and JSON for settings/status
- SQLite or lightweight persistent store for indexed entities and queue
- filesystem for snapshots and large exportable blobs

## 4. Export and sync layer

This layer transforms local records into portable vault artifacts.

Responsibilities:
- convert internal entities into export bundles
- write portable files
- update queue state
- deduplicate export attempts where practical
- ensure safe sync behavior

Export units may include:
- artifact export
- digest export
- topic export
- snapshot export

Each export bundle should preserve:
- source URL
- source type
- trust metadata
- timestamps
- related topic
- links back to original source
- local export generation time

Core modules:
- export-service.ts
- export-serializer.ts
- sync-service.ts
- sync-queue.ts
- dedupe.ts

### export-service.ts
Creates export job payloads from local vault objects.

### export-serializer.ts
Writes:
- summary.md
- source.json
- artifact.json
- digest.md
- links.txt
- snapshot.html

### sync-service.ts
Moves queued exports to USB vault safely.

### sync-queue.ts
Tracks:
- pending
- in_progress
- synced
- failed

### dedupe.ts
Avoids obvious duplicate exports using canonical id/hash/path strategy.

## 5. USB vault layer

The USB vault is a designated removable storage target with a stable directory contract.

Responsibilities:
- expose a known mount path or recognized volume name
- hold portable SourceVault export structure
- allow offline transport of research vault data
- remain optional, not mandatory for runtime survival

The runtime must never assume the USB vault is always present.

## Runtime flow

### Normal flow

1. Runtime starts
2. Settings load
3. Tracked topics load
4. Scheduler starts recurring jobs
5. Search / monitoring job runs
6. Result is normalized into Source / Artifact / Event
7. Local vault stores the result
8. ExportJob is created
9. USB monitor checks designated vault availability
10. If available, sync begins
11. Export bundle is written to USB vault
12. Job is marked synced
13. UI status updates

### When USB is absent

1. Runtime continues normally
2. Results are still stored locally
3. Export jobs are queued
4. Sync attempts are deferred
5. USB re-check continues on schedule
6. Once USB appears, pending jobs are flushed automatically

### When sync fails

1. Job is marked failed or pending_retry
2. Error is logged
3. Retry count increments
4. Runtime continues
5. UI shows degraded status if needed
6. Future retries occur automatically or manually

## Failure philosophy

Failure must be visible but non-catastrophic.

The system must:
- not crash because USB is absent
- not discard exports silently
- not block collection because sync failed
- not require the UI to remain open
- not depend on network availability for local persistence

## Startup behavior

The runtime should support:
- manual local start during development
- optional start-at-login in packaged desktop mode
- background operation without requiring the control UI to stay open

Recommended development behavior:
- start runtime as part of local app/dev script
- expose runtime status through API or shared state
- keep logs on disk for diagnosis

## Status model

Recommended runtime status states:
- idle
- running
- syncing
- degraded
- error

A degraded state is preferred over hard failure when:
- USB is missing
- some sync jobs fail
- queue backlog is growing
- non-critical exports cannot be written

## Security and safety

The runtime should:
- write only to configured USB targets
- avoid deleting user data casually
- validate paths before writing
- use atomic or safe-write patterns where possible
- keep manifests and sync state explicit
- preserve original source links and timestamps

## Suggested folder and module map

```
src/
  runtime/
    daemon.ts
    scheduler.ts
    job-runner.ts
    logger.ts
    status.ts
    event-bus.ts
  lib/
    storage/
      vault-store.ts
      queue-store.ts
      settings-store.ts
    exports/
      export-service.ts
      export-serializer.ts
      manifest.ts
    sync/
      sync-service.ts
      retry-policy.ts
      dedupe.ts
    usb/
      detect-usb.ts
      resolve-target.ts
      vault-health.ts
    models/
      topic.ts
      source.ts
      artifact.ts
      event.ts
      digest.ts
      export-job.ts
      usb-vault.ts
      runtime-state.ts
```

## Minimal implementation order

Phase 1
- runtime status model
- local storage
- scheduler foundation
- export job queue

Phase 2
- topic refresh job integration
- export generation
- sync queue processing

Phase 3
- USB vault recognition
- safe sync logic
- retry and failure handling

Phase 4
- connect runtime state into web UI
- add settings and manual sync actions

## Success criteria

SourceVault runtime is successful when:
- it can run locally without the UI being actively used
- it persists all important results locally
- it queues exports safely
- it syncs automatically to a designated USB vault when available
- it recovers gracefully from missing USB or sync failures
- it exposes clear runtime status in the control surface

## Final principle

The runtime is the product core.
The UI is the window into it.
Design and implementation decisions should favor reliability, provenance, portability, and calm operation over visual sophistication.
