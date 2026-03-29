# SourceVault Settings Schema

## Purpose

The settings schema defines all configurable behavior for SourceVault.

It exists to:
- centralize runtime configuration
- define connector and target settings
- separate public config from secrets
- support reliable background operation
- make the system inspectable and portable

## Core principle

Settings should be:
- explicit
- local-first
- stable
- easy to validate
- safe to evolve

Secrets should not live in exported content.

## Top-level sections

SourceVault settings should be grouped into:

- runtime
- connectors
- storage
- delivery
- targets
- policy
- behavior
- ui

## Schema outline

```ts
type SourceVaultSettings = {
  runtime: RuntimeSettings
  connectors: ConnectorSettings
  storage: StorageSettings
  delivery: DeliverySettings
  targets: TargetSettings
  policy: PolicySettings
  behavior: BehaviorSettings
  ui: UISettings
}
```

## Runtime settings

```ts
type RuntimeSettings = {
  startupEnabled: boolean
  backgroundMode: boolean
  scheduleEnabled: boolean
  defaultFrequency: 'hourly' | 'daily' | 'weekly'
  maxConcurrentJobs: number
  retryFailedJobs: boolean
}
```

## Connector settings

```ts
type ConnectorSettings = {
  github: {
    enabled: boolean
    authMode: 'token' | 'oauth' | 'none'
    tokenRef?: string
    includeReleases: boolean
    includeReadme: boolean
    includeIssues: boolean
    maxResultsPerQuery: number
  }
  arxiv: {
    enabled: boolean
    categories: string[]
    authorWatch: string[]
    includeVersionUpdates: boolean
    maxResultsPerQuery: number
  }
  perplexity: {
    enabled: boolean
    apiKeyRef?: string
    mode: 'discovery' | 'search' | 'supplemental'
    maxResultsPerQuery: number
    domainAllowlist: string[]
    domainBlocklist: string[]
  }
}
```

## Storage settings

```ts
type StorageSettings = {
  localVaultPath: string
  snapshotPath: string
  queuePath: string
  logPath: string
}
```

## Delivery settings

```ts
type DeliverySettings = {
  autoDeliver: boolean
  retryFailedDeliveries: boolean
  maxDeliveryAttempts: number
  manualOverrideEnabled: boolean
}
```

## Target settings

```ts
type TargetSettings = {
  raw: {
    enabled: boolean
  }
  usb: {
    enabled: boolean
    targetMode: 'path' | 'volumeName'
    targetValue: string
    autoSyncOnDetect: boolean
  }
  obsidian: {
    enabled: boolean
    vaultPath: string
    autoPush: boolean
  }
  notebook: {
    enabled: boolean
    workspacePath: string
    autoBundle: boolean
  }
  notion: {
    enabled: boolean
    tokenRef?: string
    topicsDatabaseId?: string
    artifactsDatabaseId?: string
    digestsDatabaseId?: string
    autoSync: boolean
  }
}
```

## Policy settings

```ts
type PolicySettings = {
  sourcePolicy: 'strict' | 'balanced' | 'broad'
  trustThresholdForVault: number
  trustThresholdForUSB: number
  allowSecondarySources: boolean
  blockedDomains: string[]
  requireCanonicalSourceLink: boolean
}
```

## Behavior settings

```ts
type BehaviorSettings = {
  enabled: boolean
  retentionDays: number
  useForRecommendations: boolean
  useForScheduling: boolean
  useForArchival: false
}
```

## UI settings

```ts
type UISettings = {
  showRuntimeStatus: boolean
  showTargetHealth: boolean
  showQueueState: boolean
  compactView: boolean
}
```

## Validation rules

The settings system should validate:
- required paths exist or can be created
- thresholds are within sane ranges
- target sections are internally complete when enabled
- connector settings are coherent
- no secret value is stored directly in exported config

## Secret references

Whenever possible, settings should store references to secrets, not the raw secrets themselves.

Example:
- perplexity.apiKeyRef = "PERPLEXITY_API_KEY"
- notion.tokenRef = "NOTION_TOKEN"

Actual secret values should come from:
- environment variables
- local secret storage
- secure runtime config

## Final principle

The settings schema should make SourceVault easy to run, easy to move, and hard to misconfigure.
