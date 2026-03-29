# SourceVault

A source-first, policy-driven, multi-target harnessed research pipeline that runs locally and syncs to multiple destinations.

## Product Identity

SourceVault is **not** an AI dashboard, chatbot shell, or futuristic marketing interface.

SourceVault is a calm, truthful research workspace that prioritizes:
- Source-first discovery (GitHub, arXiv, official docs)
- Evidence-first presentation
- Trust-based vault admission
- Policy-driven delivery
- Multi-target sync (USB, Obsidian, Notion, Notebook)
- **Local-first storage with intelligent retry**

## Quick Start

```bash
# Install
npm install

# Initialize database
npm run vault:init

# Run validation tests
npm run demo:e2e
npm run test:targets
npm run test:failures

# Start development
npm run dev
```

Visit http://localhost:3000

## Architecture

SourceVault consists of a complete harnessed pipeline:

```
Search (Perplexity/GitHub/arXiv)
    ↓
Normalization & Trust Scoring
    ↓
Vault Admission (admit/review/reject)
    ↓
Local Vault (SQLite)
    ↓
Push Policy Evaluation
    ↓
Delivery Harness (with retry)
    ↓
Multiple Targets (raw/USB/Obsidian/Notebook/Notion)
```

## Key Features

### ✓ Complete Pipeline
- Search orchestration with 4-layer strategy
- Trust scoring based on source type and domain
- Vault admission with 3 policy modes (strict/balanced/broad)
- Multi-target delivery with intelligent retry

### ✓ Delivery Targets
- **Raw Vault**: Local file system storage
- **USB Vault**: Timestamped exports with manifest
- **Obsidian**: Markdown with frontmatter
- **Notebook**: Local workspace
- **Notion**: API integration

### ✓ Intelligent Retry
- Failure classification (transient/configuration/permanent)
- Exponential backoff for transient failures
- No auto-retry for configuration errors
- Manual retry always available

### ✓ Real-Time Monitoring
- Runtime status dashboard
- Delivery queue statistics
- Target health monitoring
- Recent jobs with retry actions

### ✓ Comprehensive Testing
- End-to-end pipeline demo
- Target smoke tests
- Failure scenario tests

## Documentation

- **[RUNBOOK.md](RUNBOOK.md)** - Complete developer guide
- **[QUICKREF.md](QUICKREF.md)** - Quick reference for common operations
- **[VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md)** - Implementation and validation summary
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Detailed status report
- **[DELIVERY_SUMMARY.md](DELIVERY_SUMMARY.md)** - What was delivered in this phase

## Configuration

### Secrets

Create `.sourcevault/secrets.json`:

```json
{
  "PERPLEXITY_API_KEY": "pplx-...",
  "GITHUB_TOKEN": "ghp_...",
  "NOTION_TOKEN": "secret_..."
}
```

Or use environment variables:

```bash
export PERPLEXITY_API_KEY="your-key"
export GITHUB_TOKEN="your-token"
export NOTION_TOKEN="your-token"
```

### Settings

Configure via Settings UI (http://localhost:3000/settings) or edit `.sourcevault/config.json`:

```json
{
  "runtime": {
    "scheduleEnabled": true,
    "defaultFrequency": "daily",
    "maxConcurrentJobs": 3,
    "retryFailedJobs": true
  },
  "connectors": {
    "perplexity": {
      "enabled": true,
      "apiKeyRef": "PERPLEXITY_API_KEY",
      "mode": "supplemental"
    }
  },
  "targets": {
    "raw": { "enabled": true },
    "usb": {
      "enabled": true,
      "targetValue": "/Volumes/SourceVault"
    },
    "obsidian": {
      "enabled": true,
      "vaultPath": "/path/to/obsidian/vault"
    }
  },
  "policy": {
    "sourcePolicy": "strict",
    "trustThresholdForVault": 0.7,
    "trustThresholdForUSB": 0.8
  }
}
```

## Testing

### Run All Tests

```bash
# Automated test suite
npm run demo:e2e        # End-to-end pipeline
npm run test:targets    # All delivery targets
npm run test:failures   # Failure scenarios

# Or run all at once
bash scripts/run-all-tests.sh
```

### Manual Testing

```bash
# Test Perplexity search
tsx scripts/test-perplexity.ts

# Test USB detection
tsx scripts/test-usb.ts

# Test credentials
tsx scripts/test-credentials.ts
```

## Development

### Start Development Server

```bash
# Terminal 1: Web UI
npm run dev

# Terminal 2: Runtime daemon (optional)
npm run runtime
```

### Access Points

- **Dashboard**: http://localhost:3000
- **Inspection**: http://localhost:3000/inspection
- **Settings**: http://localhost:3000/settings

### Manual Operations

```bash
npm run vault:init     # Initialize/reset database
npm run sync           # Manual USB sync
npm run runtime        # Start runtime daemon
```

## Project Structure

```
SourceVault/
├── docs/                           # Specification documents
│   ├── search-orchestration-spec.md
│   ├── vault-admission-spec.md
│   ├── delivery-harness-spec.md
│   ├── credential-manager-spec.md
│   ├── push-policy-spec.md
│   ├── retry-policy-spec.md
│   ├── target-registry-spec.md
│   └── settings-schema.md
├── scripts/                        # Test and demo scripts
│   ├── demo-e2e.ts                # End-to-end demo
│   ├── test-targets.ts            # Target smoke tests
│   ├── test-failures.ts           # Failure scenarios
│   └── run-all-tests.sh           # Test runner
├── src/
│   ├── runtime/                    # Runtime daemon
│   │   ├── settings/              # Settings loader
│   │   ├── credentials/           # Credential manager
│   │   ├── registry/              # Target registry
│   │   ├── retry/                 # Retry policy
│   │   ├── policy/                # Push policy engine
│   │   ├── admission/             # Vault admission
│   │   ├── search/                # Search orchestrator
│   │   ├── connectors/            # Search connectors
│   │   ├── delivery/              # Delivery harness
│   │   │   ├── harness.ts        # Main harness
│   │   │   └── adapters/         # Target adapters
│   │   └── storage/               # SQLite adapter
│   ├── app/                        # Next.js pages
│   │   ├── page.tsx               # Dashboard
│   │   ├── inspection/            # Runtime inspection
│   │   ├── settings/              # Settings UI
│   │   └── api/                   # API routes
│   └── components/                 # UI components
└── .sourcevault/                   # Local data
    ├── config.json                # Settings
    ├── secrets.json               # API keys
    ├── vault.db                   # SQLite database
    └── vault/                     # Raw vault storage
```

## Runtime Inspection

Visit http://localhost:3000/inspection to monitor:

- **Runtime Status**: Running state, queue length, failed jobs
- **Delivery Queue**: Pending, ready, writing, synced, failed, blocked, deferred
- **Vault Admission**: Admitted, review, rejected counts
- **Target Health**: Total, enabled, configured, available, unavailable
- **Recent Jobs**: Job details with retry actions

Auto-refreshes every 10 seconds.

## Delivery Job Status

- **pending**: Waiting to process
- **ready**: Payload prepared
- **writing**: Currently delivering
- **synced**: ✓ Successfully delivered
- **failed**: ✗ Delivery failed (retryable)
- **blocked**: ✗ Blocked by policy
- **deferred**: ⚠ Waiting for target/approval

## Policy Modes

### Strict (Default)
- Primary sources only (GitHub, arXiv, official docs)
- High trust threshold (0.7)
- Rejects most secondary sources

### Balanced
- Primary + high-quality secondary
- Medium trust threshold (0.6)
- Allows well-cited analysis

### Broad
- More permissive discovery
- Lower trust threshold (0.5)
- Broader source acceptance

## USB Vault Structure

```
/Volumes/SourceVault/
├── .sourcevault                   # Marker file
├── artifacts/
│   └── 2026-03-28/               # Timestamped
│       └── {artifact-id}/
│           ├── artifact.json
│           ├── summary.md
│           ├── source.json
│           └── links.txt
└── manifest.json                  # Export manifest
```

## Obsidian Integration

```
/path/to/obsidian/vault/
└── SourceVault/
    └── Artifacts/
        └── {sanitized-title}.md   # Markdown with frontmatter
```

## API Endpoints

```bash
# Runtime
GET  /api/runtime/status
POST /api/runtime/sync

# Delivery
GET  /api/delivery/status
POST /api/delivery/{id}/retry
POST /api/delivery/{id}/approve

# Targets
GET  /api/targets
POST /api/targets/recheck

# Credentials
GET    /api/credentials
POST   /api/credentials
DELETE /api/credentials/{id}
POST   /api/credentials/{id}/verify

# Admission
GET  /api/admission/status
POST /api/admission/{id}/approve
POST /api/admission/{id}/reject

# Settings
GET  /api/settings
POST /api/settings
```

## Current Status

### ✓ Fully Functional
- Settings loader with validation
- Credential manager with verification
- Target registry with health checks
- Retry policy with backoff strategies
- Delivery harness with multi-target support
- Push policy engine
- Vault admission engine
- Search orchestrator
- Perplexity connector
- All 5 delivery adapters
- Runtime inspection dashboard
- Comprehensive test suite

### ⚠ Partially Functional
- Search (Perplexity only, no GitHub/arXiv yet)
- Runtime daemon (manual start, no auto-start)
- Credential storage (plaintext, no encryption)

### ✗ Not Implemented
- GitHub connector
- arXiv connector
- Digest generation
- Behavior signal collection

## Known Limitations

1. **GitHub/arXiv connectors not implemented** - Only Perplexity works
2. **No credential encryption** - Stored in plaintext
3. **No auto-start** - Runtime must be started manually
4. **Polling-based USB detection** - No event-based detection

See [VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md) for complete list.

## Next Steps

### Phase 1: Complete Connectors (High Priority)
1. Implement GitHub connector
2. Implement arXiv connector
3. Test multi-connector orchestration

### Phase 2: Reliability & Monitoring (High Priority)
1. Add structured logging
2. Implement health checks
3. Add alerting system

### Phase 3: Production Hardening (Medium Priority)
1. Credential encryption (OS keychain)
2. Runtime auto-start
3. USB auto-detection

See [RUNBOOK.md](RUNBOOK.md) for detailed next steps.

## Troubleshooting

### Database Issues
```bash
rm .sourcevault/vault.db
npm run vault:init
```

### Queue Stuck
1. Visit http://localhost:3000/inspection
2. Check failed jobs
3. Click "Retry" on failed jobs

### Target Unavailable
1. Visit http://localhost:3000/inspection
2. Click "Recheck All Targets"
3. Check error messages

### Logs
```bash
tail -f .sourcevault/logs/runtime.log
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules with design tokens
- **Storage**: SQLite (better-sqlite3)
- **Scheduler**: node-cron
- **Architecture**: Local-first with multi-target sync

## Design Philosophy

This project follows a constitutional framework defined in `CLAUDE.md`. All UI changes should be reviewed against:
- Design philosophy (docs/design-philosophy.md)
- UI guardrails (docs/ui-guardrails.md)
- Product requirements (docs/product-prd.md)

**Key principles:**
- Source-first, not engagement-first
- Evidence-first, not vibe-first
- Calm UX, not flashy
- Durable design, not trend-driven

## Contributing

See [RUNBOOK.md](RUNBOOK.md) for development workflow and [QUICKREF.md](QUICKREF.md) for common operations.

## License

MIT
