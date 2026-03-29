# Export Job Specification

## Purpose

Export jobs are the bridge between local vault data and the USB vault.

They allow SourceVault to:
- prepare exportable bundles
- queue them safely
- sync later if USB is unavailable
- track failures and retries
- avoid silent data loss

## Export job lifecycle

States:
- pending
- prepared
- writing
- synced
- failed
- deferred

### pending
A job has been created but the export bundle is not yet fully written.

### prepared
The export payload and target path are resolved.

### writing
A write operation is in progress.

### synced
All required export files were successfully written.

### failed
The export could not complete.

### deferred
The export is valid but waiting for USB availability or policy conditions.

## Data model

```ts
type ExportJob = {
  id: string
  itemType: 'artifact' | 'digest' | 'topic' | 'snapshot'
  itemId: string
  topicId?: string
  sourceId?: string

  status: 'pending' | 'prepared' | 'writing' | 'synced' | 'failed' | 'deferred'

  exportFormat: Array<'json' | 'md' | 'html'>
  targetKind: 'local' | 'usb'
  targetPath?: string

  trustScore?: number
  eligibleForUSB: boolean

  attempts: number
  maxAttempts: number
  lastError?: string

  createdAt: string
  updatedAt: string
  syncedAt?: string
}
```

## Eligibility rules

An export job may be created from:
- new artifact
- updated artifact
- generated digest
- topic snapshot
- manually saved item

An export job may be blocked from USB sync if:
- trust score is below threshold
- source policy rejects it
- no canonical source link exists
- item is marked noise
- target USB vault is unavailable

## Bundle outputs

### Artifact export

Required:
- artifact.json
- source.json
- summary.md
- links.txt

Optional:
- event.json
- snapshot.html

### Digest export

Required:
- digest.md

Optional:
- digest.json
- related-items.json

### Topic export

Required:
- topic.json

Optional:
- artifact index
- digest index

## Write rules

When preparing an export:
- resolve canonical destination path
- build payload files
- validate policy eligibility
- mark as prepared

When writing:
- ensure target folders exist
- write required files
- verify completion
- update manifest if needed
- mark synced only after success

## Retry rules

A failed or deferred job should:
- remain visible
- increment attempts
- retain last error
- retry later if retry policy allows

Default policy:
- 3 automatic attempts
- exponential backoff optional
- manual retry always allowed

## Dedupe rules

Avoid duplicate exports using:
- itemType + itemId + updatedAt
- canonical export path
- optional content hash later

## Queue guarantees

The queue must ensure:
- no silent drop
- retryable failures
- visible status
- stable ordering
- graceful recovery after restart

## Final principle

Export jobs are operational truth for sync behavior.
If a result is important enough to save, it must be represented as a traceable export job before USB sync is attempted.
