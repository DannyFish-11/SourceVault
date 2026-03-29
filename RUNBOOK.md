# SourceVault Developer Runbook

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- (Optional) USB drive for USB vault testing
- (Optional) Obsidian vault for Obsidian integration
- (Optional) Perplexity API key for real search

### Initial Setup

```bash
# Clone and install
git clone <repository-url>
cd SourceVault
npm install

# Initialize database
npm run vault:init

# Start development server
npm run dev
```

Visit http://localhost:3000

## Configuration

### 1. Environment Variables

Create `.sourcevault/secrets.json`:

```json
{
  "PERPLEXITY_API_KEY": "your-perplexity-api-key",
  "GITHUB_TOKEN": "your-github-token",
  "NOTION_TOKEN": "your-notion-token"
}
```

Or use environment variables:

```bash
export PERPLEXITY_API_KEY="your-key"
export GITHUB_TOKEN="your-token"
export NOTION_TOKEN="your-token"
```

### 2. Settings Configuration

Settings are stored in `.sourcevault/config.json`. Default settings are created automatically on first run.

Edit via Settings UI at http://localhost:3000/settings or manually:

```json
{
  "runtime": {
    "startupEnabled": false,
    "backgroundMode": false,
    "scheduleEnabled": true,
    "defaultFrequency": "daily",
    "maxConcurrentJobs": 3,
    "retryFailedJobs": true
  },
  "connectors": {
    "perplexity": {
      "enabled": true,
      "apiKeyRef": "PERPLEXITY_API_KEY",
      "mode": "supplemental",
      "maxResultsPerQuery": 5
    }
  },
  "targets": {
    "raw": {
      "enabled": true
    },
    "usb": {
      "enabled": true,
      "targetMode": "path",
      "targetValue": "/Volumes/SourceVault",
      "autoSyncOnDetect": true
    },
    "obsidian": {
      "enabled": true,
      "vaultPath": "/path/to/obsidian/vault",
      "autoPush": false
    }
  },
  "policy": {
    "sourcePolicy": "strict",
    "trustThresholdForVault": 0.7,
    "trustThresholdForUSB": 0.8
  }
}
```

### 3. Target Setup

#### Raw Vault (Local)
Enabled by default. Stores to `.sourcevault/vault/`.

#### USB Vault
1. Format USB drive
2. Create `.sourcevault` marker file at root
3. Set path in settings: `/Volumes/SourceVault` (macOS) or `/media/usb/SourceVault` (Linux)

#### Obsidian
1. Create or use existing Obsidian vault
2. Set vault path in settings
3. SourceVault will create `SourceVault/Artifacts/` folder

#### Notebook
1. Set workspace path in settings
2. Notebook adapter uses local file system

#### Notion
1. Create Notion integration at https://www.notion.so/my-integrations
2. Get integration token
3. Create database and get database ID
4. Add token to secrets
5. Configure in settings

## Running Tests

### End-to-End Demo

```bash
npm run demo:e2e
```

This runs the complete pipeline:
- Search (mock or real Perplexity)
- Normalization
- Trust scoring
- Vault admission
- Delivery harness
- Multi-target delivery

### Target Smoke Tests

```bash
npm run test:targets
```

Tests each delivery target adapter:
- Configuration check
- Availability check
- Eligibility check
- Serialization
- Delivery

### Failure Scenario Tests

```bash
npm run test:failures
```

Tests failure handling:
- Missing USB vault
- Invalid credentials
- Unavailable targets
- Transient failures
- Configuration errors
- Retry exhaustion

## Runtime Inspection

### Web UI

Visit http://localhost:3000/inspection to see:
- Runtime status
- Delivery queue stats
- Admission stats
- Target health
- Recent jobs with retry actions

### Manual Operations

#### Initialize Database
```bash
npm run vault:init
```

#### Manual Sync
```bash
npm run sync
```

#### Run Runtime Daemon
```bash
npm run runtime
```

## Testing Specific Scenarios

### Test Perplexity Search

```typescript
// scripts/test-perplexity.ts
import { PerplexityConnector } from '../src/runtime/connectors/perplexity';

const apiKey = process.env.PERPLEXITY_API_KEY!;
const connector = new PerplexityConnector(apiKey);

const results = await connector.search('React 19 features', 'direct');
console.log(results);
```

Run: `tsx scripts/test-perplexity.ts`

### Test USB Detection

```typescript
// scripts/test-usb.ts
import { USBVaultAdapter } from '../src/runtime/delivery/adapters/usb';

const adapter = new USBVaultAdapter('/Volumes/SourceVault');
const isAvailable = await adapter.isAvailable();
console.log('USB available:', isAvailable);
```

Run: `tsx scripts/test-usb.ts`

### Test Credential Verification

```typescript
// scripts/test-credentials.ts
import { SQLiteAdapter } from '../src/runtime/storage';
import { CredentialManager } from '../src/runtime/credentials';

const storage = new SQLiteAdapter();
const manager = new CredentialManager(storage);

const cred = await manager.createCredential({
  target: 'perplexity',
  authType: 'api_key',
  label: 'Test Key',
  value: 'your-key',
});

const isValid = await manager.verifyCredential(cred.id);
console.log('Valid:', isValid);

storage.close();
```

Run: `tsx scripts/test-credentials.ts`

## Simulating Failures

### Missing USB Vault

```bash
# Set invalid USB path in settings
# Run demo or create delivery job
# Job should be deferred with "Target not available" error
```

### Invalid API Key

```bash
# Set invalid Perplexity API key
export PERPLEXITY_API_KEY="invalid-key"
npm run demo:e2e
# Should fail gracefully with verification error
```

### Transient Network Failure

```typescript
// Modify adapter to throw network error
throw new Error('Network timeout');
// System should classify as transient and schedule retry
```

### Configuration Error

```bash
# Enable Notion without token
# Job should be deferred with configuration error
# Should not retry automatically
```

## Troubleshooting

### Database Issues

```bash
# Reset database
rm .sourcevault/vault.db
npm run vault:init
```

### Queue Stuck

```bash
# Check failed jobs
sqlite3 .sourcevault/vault.db "SELECT * FROM delivery_jobs WHERE status='failed';"

# Retry all failed jobs via UI or API
curl -X POST http://localhost:3000/api/delivery/{job-id}/retry
```

### Target Unavailable

```bash
# Recheck all targets
curl -X POST http://localhost:3000/api/targets/recheck

# Check specific target
# Visit http://localhost:3000/inspection
```

### Logs

```bash
# Runtime logs stored in .sourcevault/logs/
tail -f .sourcevault/logs/runtime.log
```

## Development Workflow

### Adding New Connector

1. Create connector in `src/runtime/connectors/`
2. Implement `Connector` interface
3. Register in search orchestrator
4. Add settings schema
5. Add credential verification
6. Write smoke test

### Adding New Target

1. Create adapter in `src/runtime/delivery/adapters/`
2. Implement `DeliveryAdapter` interface
3. Add to target registry
4. Add settings schema
5. Add push policy rules
6. Write smoke test

### Testing Changes

```bash
# Run all tests
npm run test:targets
npm run test:failures
npm run demo:e2e

# Check runtime inspection
# Visit http://localhost:3000/inspection
```

## Production Deployment

### Build

```bash
npm run build
```

### Run Production

```bash
# Start Next.js server
npm start

# Start runtime daemon (separate process)
npm run runtime
```

### Environment

```bash
# Production secrets
export PERPLEXITY_API_KEY="prod-key"
export GITHUB_TOKEN="prod-token"
export NOTION_TOKEN="prod-token"

# Production config
cp .sourcevault/config.json .sourcevault/config.prod.json
```

## Known Gaps

### Current Limitations

1. **No GitHub/arXiv connectors implemented yet**
   - Only Perplexity connector is complete
   - GitHub and arXiv are scaffolded but not functional

2. **No digest generation**
   - Digest system is specified but not implemented
   - Only artifacts are processed

3. **No behavior signals collection**
   - Behavior signals schema exists but no collection logic

4. **Limited retry backoff testing**
   - Exponential backoff implemented but not thoroughly tested
   - No integration tests for retry timing

5. **No runtime daemon auto-start**
   - Runtime must be started manually
   - No systemd/launchd integration

6. **No credential encryption**
   - Credentials stored in plaintext in secrets.json
   - Should use OS keychain in production

7. **No USB auto-detection**
   - USB detection is polling-based
   - No event-based detection for plug/unplug

8. **Limited error recovery**
   - Some edge cases may not be handled gracefully
   - Need more comprehensive error testing

## Next Recommended Phase

### Phase 1: Complete Connectors (High Priority)

1. **Implement GitHub Connector**
   - Repository search
   - Release tracking
   - README extraction
   - Issue tracking (optional)

2. **Implement arXiv Connector**
   - Paper search by category
   - Author tracking
   - Version updates

3. **Test multi-connector orchestration**
   - Verify 4-layer search works with all connectors
   - Test deduplication across connectors

### Phase 2: Reliability & Monitoring (High Priority)

1. **Add comprehensive logging**
   - Structured logging with levels
   - Log rotation
   - Error tracking

2. **Add health checks**
   - Connector health endpoints
   - Target availability monitoring
   - Queue health metrics

3. **Add alerting**
   - Failed job notifications
   - Target unavailable alerts
   - Queue backlog warnings

### Phase 3: Production Hardening (Medium Priority)

1. **Credential encryption**
   - OS keychain integration
   - Encrypted secrets file
   - Credential rotation support

2. **Runtime daemon improvements**
   - Auto-start on boot
   - Graceful shutdown
   - Process monitoring

3. **USB auto-detection**
   - Event-based detection
   - Auto-sync on connect
   - Safe disconnect handling

### Phase 4: Feature Completion (Medium Priority)

1. **Digest generation**
   - Topic digests
   - Time-based digests
   - Custom digest templates

2. **Behavior signals**
   - Signal collection
   - Interest profiling
   - Recommendation engine

3. **Advanced search**
   - Saved searches
   - Search templates
   - Query refinement

### Phase 5: UI Polish (Low Priority)

1. **Dashboard improvements**
   - Real-time updates
   - Charts and graphs
   - Activity timeline

2. **Topic management**
   - Topic creation UI
   - Source management
   - Artifact browsing

3. **Review queue**
   - Review item UI
   - Approval workflow
   - Batch operations

## Support

For issues or questions:
1. Check this runbook
2. Review specification docs in `docs/`
3. Run diagnostic tests
4. Check runtime inspection UI
5. Review logs in `.sourcevault/logs/`
