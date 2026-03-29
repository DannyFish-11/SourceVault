# SourceVault Behavior Signals Specification

## Purpose

Behavior signals help SourceVault understand what the user repeatedly cares about.

They are useful for:
- recommendation
- scheduling priority
- query refinement
- topic suggestion

They must not become direct authority for archival decisions.

## Core principle

Behavior is a hint, not a source.

Behavior signals should influence:
- what to look at next
- what to prioritize
- what to suggest

Behavior signals should not directly determine:
- truth
- trust score override
- vault admission
- USB export eligibility

## Signal categories

### 1. Search repetition
Examples:
- repeated searches for the same topic
- repeated searches for the same repo or paper
- repeated reformulations of similar query

### 2. Visit repetition
Examples:
- repeated opening of the same source domain
- repeated opening of same artifact note
- repeated viewing of same topic page

### 3. Save behavior
Examples:
- user manually saves artifacts from the same topic
- user frequently approves similar item types
- user repeatedly promotes review items to admitted items

### 4. Time-spent signals
Examples:
- longer dwell time on certain topics
- repeated deeper reading of specific source types

### 5. Explicit signals
Examples:
- follows a topic
- pins a source
- marks a domain as preferred
- subscribes to an author or repo

## Allowed uses

Behavior signals may be used to:

- suggest new tracked topics
- increase refresh priority for already tracked topics
- refine search query templates
- generate "you seem interested in…" recommendations
- surface likely-relevant review items

## Forbidden uses

Behavior signals may not be used to:

- auto-admit noisy items
- bypass trust scoring
- bypass noise filtering
- override blocked domains
- export directly to USB without normal policy checks

## Signal model

```ts
type BehaviorSignal = {
  id: string
  signalType:
    | 'search_repeat'
    | 'visit_repeat'
    | 'save_pattern'
    | 'dwell_time'
    | 'explicit_follow'
  subjectType: 'topic' | 'artifact' | 'source' | 'domain' | 'query'
  subjectId: string
  weight: number
  recordedAt: string
}
```

## Aggregated interest profile

Signals may be aggregated into a lightweight interest profile.

```ts
type InterestProfile = {
  topics: Array<{ id: string; weight: number }>
  domains: Array<{ domain: string; weight: number }>
  sourceTypes: Array<{ sourceType: string; weight: number }>
  queries: Array<{ query: string; weight: number }>
}
```

This profile should be used only for recommendation and scheduling.

## Privacy and restraint

Behavior collection should remain minimal and local-first.

Recommended rules:
- store signals locally by default
- avoid invasive tracking
- keep raw event logging limited
- allow behavior signals to be disabled
- let user clear behavior history

## UI exposure

The control surface may optionally show:

- suggested topics
- "frequently revisited"
- "likely relevant to your current tracking"
- recent behavior-derived recommendations

Do not present behavior telemetry as decorative analytics.

## Retention rules

Behavior signals should not be retained forever by default.

Suggested retention:
- raw signals: 30 to 90 days
- aggregate interest profile: rolling update
- explicit follows/pins: persistent until changed

## Final principle

Behavior signals exist to make SourceVault more useful, not more noisy.
They should sharpen the system's attention without weakening its source-first discipline.
