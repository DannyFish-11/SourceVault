# SourceVault Local-First Integration Plan

## Current State Analysis

### Reusable Components
✅ **Data Models** (src/lib/types.ts):
- Source, Topic, Artifact, Event, Collection, Digest, Signal
- All models are ready for local persistence
- Need to add: ExportJob, SyncState, RuntimeSettings

✅ **Web UI**:
- Dashboard, Search, Topic, Artifact, Vault, Inbox pages
- Layout, Table, Panel components
- All remain as control surface

✅ **Design System**:
- Tokens, typography, components
- Constitutional framework intact

### What's Missing
❌ Local runtime daemon
❌ Background scheduler
❌ Local storage/database
❌ USB vault detection
❌ Export pipeline
❌ Sync queue management
❌ Runtime status API

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Control Surface (Web UI)                          │
│ - Current Next.js pages remain                             │
│ - Add: Runtime status panel                                │
│ - Add: Manual sync trigger                                 │
│ - Add: Settings page for USB path/schedule                 │
└─────────────────────────────────────────────────────────────┘
                            ↓ API calls
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Runtime Daemon                                     │
│ - Background scheduler (cron-like)                          │
│ - Job executor (search, ingest, export, sync)              │
│ - Status reporter                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓ reads/writes
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Local Vault (SQLite)                              │
│ - Topics, Sources, Artifacts, Events                       │
│ - Export queue, Sync state                                 │
│ - Settings, Runtime logs                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ exports to
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: USB Vault (File System)                           │
│ - Structured folder tree                                   │
│ - Markdown summaries, JSON metadata                        │
│ - Digest exports, Snapshots                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Current)
**Goal**: Set up runtime structure and local storage

**New Modules**:
```
src/runtime/
  ├── index.ts              # Runtime entry point
  ├── scheduler.ts          # Job scheduling
  ├── executor.ts           # Job execution
  └── status.ts             # Runtime status tracking

src/runtime/storage/
  ├── index.ts              # Storage interface
  ├── sqlite.ts             # SQLite adapter
  └── schema.sql            # Database schema

src/runtime/jobs/
  ├── types.ts              # Job definitions
  ├── search.ts             # Search job
  ├── ingest.ts             # Ingest job
  └── digest.ts             # Digest generation

src/lib/vault/
  ├── settings.ts           # Settings management
  └── types.ts              # Vault-specific types
```

**New Types** (extend src/lib/types.ts):
```typescript
export interface ExportJob {
  id: string;
  artifactId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SyncState {
  id: string;
  lastSyncAt?: Date;
  usbConnected: boolean;
  usbPath?: string;
  pendingExports: number;
  failedExports: number;
}

export interface RuntimeSettings {
  usbVaultPath?: string;
  usbVaultName?: string;
  scheduleInterval: number; // minutes
  autoSync: boolean;
}
```

**Database Schema** (SQLite):
- topics, sources, artifacts, events, collections, digests
- export_jobs, sync_state, settings, runtime_logs

---

### Phase 2: USB Vault Detection & Export

**New Modules**:
```
src/runtime/usb/
  ├── detector.ts           # USB detection logic
  └── validator.ts          # Vault structure validation

src/runtime/export/
  ├── index.ts              # Export orchestrator
  ├── formatter.ts          # Format artifacts for export
  └── writer.ts             # Write to USB vault
```

**USB Vault Structure**:
```
/Volumes/SourceVault/  (or configured path)
├── topics/
│   └── {topic-id}/
│       ├── metadata.json
│       └── artifacts/
├── artifacts/
│   └── {artifact-id}/
│       ├── summary.md
│       ├── artifact.json
│       ├── source.json
│       ├── links.txt
│       └── snapshot.html (optional)
├── digests/
│   └── {date}/
│       └── digest.md
├── exports/
│   └── {timestamp}/
└── .sourcevault
    └── sync-state.json
```

---

### Phase 3: Sync Queue & Retry

**New Modules**:
```
src/runtime/sync/
  ├── index.ts              # Sync orchestrator
  ├── queue.ts              # Export queue manager
  └── retry.ts              # Retry logic
```

**Sync Behavior**:
1. Check if USB vault is connected
2. If yes: process pending exports
3. If no: queue exports locally
4. Retry failed exports with exponential backoff
5. Update sync state after each batch

---

### Phase 4: Web UI Integration

**Minimal Changes**:
1. Add `/api/runtime/status` endpoint
2. Add `/api/runtime/sync` endpoint (manual trigger)
3. Add `/api/settings` endpoint
4. Add status panel to Dashboard
5. Add Settings page

**New Pages**:
```
src/app/settings/
  └── page.tsx              # Settings page

src/app/api/runtime/
  ├── status/route.ts       # GET runtime status
  └── sync/route.ts         # POST manual sync

src/app/api/settings/
  └── route.ts              # GET/POST settings
```

**Dashboard Enhancement**:
Add status panel showing:
- Runtime: Running / Stopped
- USB Vault: Connected / Disconnected
- Last Sync: timestamp
- Queue: N pending exports
- Manual Sync button

---

## Technical Decisions

### Storage: SQLite
**Why**:
- Local-first, no server required
- Single file database
- Good Node.js support (better-sqlite3)
- Suitable for structured data + queue management

### Scheduler: node-cron
**Why**:
- Simple cron-like scheduling
- Runs in Node.js process
- No external dependencies

### USB Detection: fs.existsSync + polling
**Why**:
- Cross-platform (checks configured path)
- Simple and reliable
- Event-based detection can be added later (chokidar)

### Export Format: Markdown + JSON
**Why**:
- Human-readable
- Version-control friendly
- Preserves provenance
- Easy to inspect on USB drive

---

## Integration Strategy

### Do NOT Break
- Existing web UI pages
- Current data models
- Design system
- Constitutional framework

### Extend Carefully
1. Add runtime modules in parallel
2. Keep web UI as thin control layer
3. Runtime can run independently
4. Web UI queries runtime status via API
5. Manual sync available even if scheduler is off

### Startup Flow
```
1. Next.js starts
2. Runtime daemon initializes
3. Load settings from SQLite
4. Check USB vault availability
5. Start scheduler if enabled
6. Web UI becomes available
7. Background jobs run on schedule
```

---

## File Changes Summary

### New Files (20+)
- src/runtime/* (scheduler, executor, status)
- src/runtime/storage/* (SQLite adapter, schema)
- src/runtime/jobs/* (search, ingest, digest)
- src/runtime/usb/* (detector, validator)
- src/runtime/export/* (formatter, writer)
- src/runtime/sync/* (queue, retry)
- src/lib/vault/* (settings, types)
- src/app/api/runtime/* (status, sync endpoints)
- src/app/api/settings/* (settings endpoint)
- src/app/settings/page.tsx (settings UI)

### Modified Files (3)
- src/lib/types.ts (add ExportJob, SyncState, RuntimeSettings)
- src/app/page.tsx (add runtime status panel)
- package.json (add dependencies)

### New Dependencies
- better-sqlite3 (SQLite)
- node-cron (scheduler)
- uuid (ID generation)

---

## Next Steps Checklist

Phase 1:
- [ ] Add new dependencies to package.json
- [ ] Extend src/lib/types.ts with runtime types
- [ ] Create src/runtime/storage/schema.sql
- [ ] Implement SQLite adapter
- [ ] Create runtime scheduler
- [ ] Create basic job executor
- [ ] Test local storage persistence

Phase 2:
- [ ] Implement USB detection
- [ ] Create export formatter
- [ ] Implement file writer for USB vault
- [ ] Test export to USB structure

Phase 3:
- [ ] Implement sync queue
- [ ] Add retry logic
- [ ] Test sync behavior (USB present/absent)

Phase 4:
- [ ] Add API endpoints for runtime status
- [ ] Add status panel to Dashboard
- [ ] Create Settings page
- [ ] Test manual sync trigger

Phase 5:
- [ ] End-to-end test: topic → result → local → USB sync
- [ ] Document startup process
- [ ] Update README with local-first instructions

---

## Running Locally

```bash
# Install dependencies
npm install

# Initialize local vault database
npm run vault:init

# Start development (web UI + runtime daemon)
npm run dev

# Start runtime daemon only
npm run runtime

# Manual sync trigger
npm run sync
```

---

## Safety Guarantees

✅ No data loss if USB disconnected
✅ All exports queued locally first
✅ Retry logic for failed syncs
✅ Provenance preserved in all exports
✅ Runtime errors logged, don't crash app
✅ Web UI remains functional without runtime
✅ Manual sync always available

---

This plan maintains the constitutional framework while evolving SourceVault into a local-first background research agent with USB vault sync.
