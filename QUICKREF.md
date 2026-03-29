# SourceVault Quick Reference

## Common Commands

```bash
# Development
npm run dev                 # Start web UI (http://localhost:3000)
npm run runtime            # Start runtime daemon

# Database
npm run vault:init         # Initialize/reset database

# Testing
npm run demo:e2e           # Full pipeline demo
npm run test:targets       # Test all delivery targets
npm run test:failures      # Test failure scenarios

# Manual Operations
npm run sync               # Manual USB sync
```

## Quick URLs

- **Dashboard**: http://localhost:3000
- **Inspection**: http://localhost:3000/inspection
- **Settings**: http://localhost:3000/settings

## Configuration Files

```
.sourcevault/
├── config.json           # Main settings
├── secrets.json          # API keys and tokens
├── vault.db             # SQLite database
├── vault/               # Raw vault storage
├── queue/               # Job queue
└── logs/                # Runtime logs
```

## Secrets Template

Create `.sourcevault/secrets.json`:

```json
{
  "PERPLEXITY_API_KEY": "pplx-...",
  "GITHUB_TOKEN": "ghp_...",
  "NOTION_TOKEN": "secret_..."
}
```

## Target Setup Checklist

### Raw Vault
- [x] Enabled by default
- [x] No configuration needed

### USB Vault
- [ ] Format USB drive
- [ ] Create `.sourcevault` marker file at root
- [ ] Set path in settings: `/Volumes/SourceVault` or `/media/usb/SourceVault`
- [ ] Enable in settings

### Obsidian
- [ ] Create or locate Obsidian vault
- [ ] Set vault path in settings
- [ ] Enable in settings

### Notion
- [ ] Create Notion integration
- [ ] Get integration token
- [ ] Create database and get ID
- [ ] Add token to secrets.json
- [ ] Configure database ID in settings
- [ ] Enable in settings

## Troubleshooting Quick Fixes

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

## Status Indicators

### Delivery Job Status
- **pending**: Waiting to process
- **ready**: Payload prepared
- **writing**: Currently delivering
- **synced**: ✓ Successfully delivered
- **failed**: ✗ Delivery failed (retryable)
- **blocked**: ✗ Blocked by policy
- **deferred**: ⚠ Waiting for target/approval

### Target Status
- **enabled**: Target is turned on
- **configured**: Target has required settings
- **available**: Target is currently reachable

### Admission Status
- **admit**: ✓ Accepted into vault
- **review**: ⚠ Needs manual review
- **reject**: ✗ Rejected

## API Endpoints

```bash
# Runtime Status
GET /api/runtime/status

# Delivery
GET /api/delivery/status
POST /api/delivery/{id}/retry
POST /api/delivery/{id}/approve

# Targets
GET /api/targets
POST /api/targets/recheck

# Credentials
GET /api/credentials
POST /api/credentials
DELETE /api/credentials/{id}
POST /api/credentials/{id}/verify

# Admission
GET /api/admission/status
POST /api/admission/{id}/approve
POST /api/admission/{id}/reject

# Settings
GET /api/settings
POST /api/settings
```

## Failure Classification

### Transient (Auto-retry)
- Network timeout
- Rate limit
- Temporary unavailability

### Configuration (No auto-retry)
- Missing credential
- Invalid path
- Disabled target

### Permanent (No retry)
- Malformed data
- Blocked domain
- Explicit rejection

## Retry Strategy

- **Max attempts**: 3
- **Backoff**: Exponential (5s, 10s, 20s, ...)
- **Max delay**: 5 minutes
- **Manual retry**: Always allowed (up to 10 total)

## Policy Modes

### Strict
- Primary sources only
- High trust threshold (0.7)
- Official docs, GitHub, arXiv

### Balanced
- Primary + high-quality secondary
- Medium trust threshold (0.6)
- Includes well-cited analysis

### Broad
- More permissive discovery
- Lower trust threshold (0.5)
- Broader source acceptance

## Search Layers

1. **Direct**: Known source targets (highest priority)
2. **Primary**: Primary source expansion
3. **Supplemental**: Broader discovery (Perplexity)
4. **Review**: Context-only materials

## Next Steps After Setup

1. **Configure credentials** in Settings
2. **Enable targets** you want to use
3. **Run demo** to test pipeline: `npm run demo:e2e`
4. **Check inspection** UI for results
5. **Create topics** and start tracking
6. **Monitor** via inspection dashboard

## Getting Help

1. Check `RUNBOOK.md` for detailed guide
2. Check `VALIDATION_SUMMARY.md` for system state
3. Review specification docs in `docs/`
4. Check inspection UI for runtime state
5. Review logs in `.sourcevault/logs/`
