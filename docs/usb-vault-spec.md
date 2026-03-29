# SourceVault USB Vault Specification

## Purpose

The SourceVault USB vault is a designated removable research archive.
It is the physical export target for SourceVault Local.

Its purpose is to:
- receive portable research outputs
- preserve provenance
- allow offline transport
- maintain structured topic-based archives
- sync automatically when connected

The USB vault is not the only data store.
Local storage remains the primary operational store.
The USB vault is a synchronized physical research repository.

## Recognition model

First version should support either:
- configured mount path
- configured volume name

Examples:
- Windows path: E:\SourceVault
- macOS path: /Volumes/SourceVault
- volume label match: "SourceVault"

Recognition rules:
1. load configured target settings
2. resolve current path or mounted volume
3. validate expected vault structure if present
4. mark vault as available only when safe target is confirmed

The system must not write to arbitrary removable drives by mistake.

## Vault root structure

The USB vault root should be:

```
SourceVault/
  metadata/
  topics/
  artifacts/
  digests/
  exports/
  queue/
  snapshots/
  logs/
```

All writes should remain under this root.

## Folder contract

### metadata/
Holds vault-level metadata.

Suggested files:
- vault.json
- device.json
- sync-state.json
- manifest.json

#### vault.json
Contains:
- vault version
- created time
- last synced time
- target label
- schema version

#### device.json
Contains:
- machine identifier
- first connected time
- last connected time
- optional device notes

#### sync-state.json
Contains:
- last sync job id
- last sync status
- pending count
- failed count

#### manifest.json
Contains:
- exported item ids
- canonical paths
- hashes if used
- updated times

### topics/
Topic-oriented exports.

Structure:
```
topics/
  <topic-slug>/
    topic.json
    digests/
    artifacts/
    snapshots/
```

#### topic.json
Contains:
- topic id
- name
- query
- status
- frequency
- createdAt
- updatedAt

### artifacts/
Artifact-oriented exports.

Structure:
```
artifacts/
  <artifact-id>/
    artifact.json
    source.json
    summary.md
    links.txt
    snapshot.html (optional)
    event.json (optional)
```

#### artifact.json
Contains:
- artifact id
- topic id
- source id
- artifact type
- title
- canonical URL
- summary
- publishedAt
- createdAt
- updatedAt

#### source.json
Contains:
- source id
- domain
- URL
- source type
- trust score
- firstSeenAt
- lastSeenAt

#### summary.md
Human-readable export summary.
Should remain concise, factual, and source-oriented.

#### links.txt
Contains:
- canonical URL
- source URL
- related URLs
- topic reference

#### snapshot.html
Optional saved snapshot if HTML capture is supported.

#### event.json
Optional current event context.
Contains:
- event id
- type
- message
- event time

### digests/
Digest exports.

Structure:
```
digests/
  YYYY-MM-DD-daily.md
  YYYY-WW-weekly.md
  alerts/
    <digest-id>.md
```

Each digest should include:
- title
- generatedAt
- covered topics
- important changes
- source links

### exports/
Operational export records.

Suggested files:
- manifest.json
- exported-jobs.json

This folder tracks what the runtime attempted to export.

### queue/
Portable sync queue state.

Suggested files:
- pending.json
- failed.json

This is helpful for diagnostics and recovery, but local runtime state remains authoritative.

### snapshots/
Optional raw snapshots grouped by date or topic.

Possible structure:
```
snapshots/
  2026-03-28/
  <topic-slug>/
```

### logs/
Optional sync and export logs.

Suggested files:
- sync.log
- errors.log

## Naming rules

Use stable, readable, and collision-resistant naming.

### Topic folder naming
Use topic slug:
- arc-agi-benchmark
- perplexity-api
- agent-runtime

### Artifact folder naming
Prefer canonical id or deterministic hash:
- artifact-01HZX...
- repo-arc-agi-benchmark
- paper-2026-03-28-abc123

### Digest naming
Use date and type:
- 2026-03-28-daily.md
- 2026-week-13-weekly.md

## Export rules

Every export must preserve provenance.

Minimum export requirements:
- original source link
- source type
- timestamps
- artifact identifier
- topic relation if known
- export generation time

Exports should be:
- append-friendly
- readable outside the app
- recoverable even if the runtime is unavailable later

## Write safety rules

The runtime must:
- ensure vault root exists before writing
- create missing subfolders safely
- validate target path
- avoid deleting unknown user files
- prefer safe-write or temp-write then rename patterns when practical
- update manifest after successful write
- never mark a job synced before the write actually succeeds

## Sync lifecycle

### Pending
A local export job is created but not yet written to USB.

### In progress
USB vault is available and sync has started.

### Synced
All required files were written successfully and manifest updated.

### Failed
Write failed due to:
- unavailable target
- invalid path
- permission problem
- partial write failure
- serialization error

### Retry
Failed or deferred jobs should be retried later without requiring user intervention.

## Deduplication strategy

First version may use simple deduplication:
- do not rewrite if canonical export path already exists and job is unchanged
- compare artifact id + updatedAt
- compare digest id + generatedAt

Later version can add hashes for stronger dedupe.

## Offline and recovery behavior

If USB is not connected:
- continue local collection
- keep exports queued
- do not block normal system work

If USB is reconnected:
- re-validate target
- resume pending sync
- update sync-state metadata

If a sync crashes midway:
- incomplete job remains pending or failed
- local system remains authoritative
- next sync attempt should recover cleanly

## Minimal required files per artifact export

Required:
- artifact.json
- source.json
- summary.md
- links.txt

Optional:
- event.json
- snapshot.html

## Minimal required files per topic export

Required:
- topic.json

Optional:
- digest references
- topic-level snapshots
- related artifact index

## Minimal required files per digest export

Required:
- digest markdown file

Optional:
- digest metadata json
- related item index

## Recommended vault metadata example

vault.json:
```json
{
  "vaultVersion": "1.0",
  "schemaVersion": "1",
  "label": "SourceVault",
  "createdAt": "2026-03-28T00:00:00Z",
  "lastSyncedAt": "2026-03-28T00:00:00Z"
}
```

## Implementation principle

The USB vault must remain:
- portable
- inspectable by humans
- robust against missing UI
- useful even outside the app
- structured enough for later resync or import

## Final principle

The USB vault is a physical extension of the local research system.
It should behave like a calm, trustworthy archive:
structured, traceable, durable, and easy to inspect.
