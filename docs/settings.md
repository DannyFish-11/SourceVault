# SourceVault Settings Specification

## Purpose

Settings control how SourceVault Local runs, which source connectors are enabled, how the runtime behaves, and how exports are synced to the USB vault.

Settings should be explicit, local-first, and easy to inspect.

## Categories

SourceVault settings are grouped into:

1. Runtime
2. Search and collection
3. Source connectors
4. Trust and filtering
5. USB vault
6. Export formats
7. UI and control surface

## 1. Runtime settings

### startupEnabled
Type: boolean
Meaning:
- if true, SourceVault should start automatically when the local machine session starts

### backgroundMode
Type: boolean
Meaning:
- if true, runtime continues in background without requiring the control UI to remain open

### scheduleEnabled
Type: boolean
Meaning:
- if true, scheduled jobs are allowed to run

### defaultFrequency
Type: 'hourly' | 'daily' | 'weekly'
Meaning:
- default schedule for tracked topics when no topic-specific override exists

### retryFailedJobs
Type: boolean
Meaning:
- if true, failed export/sync jobs will be retried automatically

## 2. Search and collection settings

### autoTrackSavedItems
Type: boolean
Meaning:
- when a user saves an artifact, the related topic may be auto-tracked

### enableBehaviorSignals
Type: boolean
Meaning:
- allows use of browsing/search history as recommendation signals only

### behaviorSignalsAffectStorage
Type: boolean
Default: false
Meaning:
- if false, behavior signals never directly cause archival
- behavior signals may only influence recommendation and scheduling

### topicRefreshLimit
Type: number
Meaning:
- maximum topics refreshed per cycle

### resultLimitPerRun
Type: number
Meaning:
- maximum normalized items per scheduled collection cycle

## 3. Source connector settings

### github.enabled
Type: boolean

### github.authMode
Type: 'token' | 'oauth' | 'none'

### github.token
Type: string

### github.defaultScopes
Type: string[]

### github.defaultSources
Type: string[]
Examples:
- repositories
- releases
- readme
- issues
- organizations

### arxiv.enabled
Type: boolean

### arxiv.authMode
Type: 'none'
Meaning:
- first version uses public API access

### arxiv.categories
Type: string[]
Examples:
- cs.AI
- cs.LG
- cs.CL

### arxiv.authorWatch
Type: string[]

### perplexity.enabled
Type: boolean

### perplexity.apiKey
Type: string

### perplexity.mode
Type: 'discovery' | 'search' | 'supplemental'
Meaning:
- discovery: find candidate sources
- search: active topic retrieval
- supplemental: only fill gaps after primary-source search

### perplexity.domainAllowlist
Type: string[]

### perplexity.domainBlocklist
Type: string[]

## 4. Trust and filtering settings

### sourcePolicy
Type: 'strict' | 'balanced' | 'broad'

Meaning:
- strict: official / GitHub / arXiv / direct primary materials only
- balanced: allow selected secondary materials after source-first results
- broad: wider discovery, but still subject to trust scoring

### trustThresholdForVault
Type: number
Meaning:
- minimum trust score required before automatic archival

### trustThresholdForUSBExport
Type: number
Meaning:
- minimum trust score required before auto-export to USB vault

### allowedSourceTypes
Type: string[]

### blockedDomains
Type: string[]

### allowSecondarySources
Type: boolean

### requireCanonicalSourceLink
Type: boolean
Meaning:
- if true, items without traceable source links cannot enter the vault automatically

## 5. USB vault settings

### usbTargetMode
Type: 'path' | 'volumeName'

### usbTargetValue
Type: string
Examples:
- E:\\SourceVault
- /Volumes/SourceVault
- SourceVault

### autoSyncOnDetect
Type: boolean

### syncOnlyTrustedItems
Type: boolean

### writeLogsToUSB
Type: boolean

## 6. Export settings

### exportFormats
Type: Array<'json' | 'md' | 'html'>

### includeSnapshots
Type: boolean

### includeDigestExports
Type: boolean

### includeTopicIndexes
Type: boolean

### dedupeExports
Type: boolean

## 7. UI settings

### showRuntimeStatus
Type: boolean

### showQueueState
Type: boolean

### showUSBStatus
Type: boolean

### compactView
Type: boolean

## Recommended defaults

- startupEnabled: true
- backgroundMode: true
- scheduleEnabled: true
- defaultFrequency: daily
- retryFailedJobs: true

- autoTrackSavedItems: true
- enableBehaviorSignals: true
- behaviorSignalsAffectStorage: false

- github.enabled: true
- arxiv.enabled: true
- perplexity.enabled: true

- sourcePolicy: strict
- trustThresholdForVault: 75
- trustThresholdForUSBExport: 80
- requireCanonicalSourceLink: true

- autoSyncOnDetect: true
- syncOnlyTrustedItems: true

## Final principle

Settings must preserve source-first behavior.
Behavior signals may assist discovery, but only trusted, traceable, and policy-compliant results should enter the vault or USB archive automatically.
