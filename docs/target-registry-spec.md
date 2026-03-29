# SourceVault Target Registry Specification

## Purpose

The Target Registry is the central directory of all configured delivery targets.

It exists to:
- track which targets are enabled
- track which targets are available
- track target type and config
- provide a single lookup point for Delivery Harness

## Core principle

The registry should know:
- what targets exist
- how they are identified
- whether they are configured
- whether they are currently reachable
- which adapter handles them

It should not itself perform delivery logic.

## Registry model

```ts
type TargetRegistryEntry = {
  id: string
  target: 'raw' | 'usb' | 'obsidian' | 'notebook' | 'notion'
  enabled: boolean
  configured: boolean
  available: boolean
  adapterName: string
  mode: 'local' | 'remote'
  lastCheckedAt?: string
  lastError?: string
}
```

## Responsibilities

The Target Registry must:
- load target definitions from settings
- validate target completeness
- resolve adapter mapping
- check target availability
- expose registry state to Delivery Harness
- expose target status to control UI

## Target examples

### raw
- always local
- usually configured if local vault exists
- usually available if storage path is valid

### usb
- local
- available only if configured path or volume exists
- may become unavailable dynamically

### obsidian
- local
- configured if vault path is set
- available if path exists and is writable

### notebook
- local
- configured if workspace path is set
- available if path exists or can be created safely

### notion
- remote
- configured if token and database ids are present
- available if token validates and remote API is reachable

## Registry lifecycle

1. settings load
2. registry builds entries
3. each entry validates config
4. each entry checks availability
5. registry publishes state
6. Delivery Harness consults registry before push

## Availability rules

Configured does not mean available.

Examples:
- USB target configured but not plugged in
- Obsidian path configured but folder missing
- Notion token present but invalid
- Notebook path configured but not writable

## API suggestion

The UI may expose:
- GET /api/targets
- GET /api/targets/:id
- POST /api/targets/recheck

## Final principle

The Target Registry is the system map of delivery destinations.
It should keep target state simple, explicit, and queryable.
