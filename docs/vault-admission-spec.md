# SourceVault Vault Admission Specification

## Purpose

Vault admission determines which normalized and scored items are allowed to enter the SourceVault authoritative vault.

This is stricter than discovery.
This is stricter than recommendation.
This is upstream of all export adapters.

An item may be found, scored, and shown in review without being admitted into the vault.

## Core principle

The vault is the trusted core archive.

It should contain:
- source-traceable items
- high-value items
- durable items
- items with stable identifiers
- items worth revisiting later

It should not contain:
- low-value noise
- unclear reposts
- unsupported commentary
- unstable discovery fragments
- engagement-first clutter

## Admission stages

Every candidate should pass through these stages:

1. Connector fetch
2. Normalization
3. Canonical source resolution
4. Trust scoring
5. Noise filtering
6. Admission policy evaluation
7. Vault write
8. Downstream export eligibility evaluation

## Admission decisions

Each candidate must end in one of these outcomes:

- admit
- review
- reject

### admit
The item is eligible for authoritative local vault storage.

### review
The item is useful enough to inspect, but not strong enough for automatic archival.

### reject
The item should not be stored in the vault.

## Minimum admission requirements

An item must satisfy all of the following to be auto-admitted:

- has canonical source link
- has stable item identifier or resolvable canonical URL
- passes trust threshold for current source policy
- is not blocked by noise filter
- is not from blocked domain
- has minimally valid metadata
- has meaningful relation to a tracked topic or explicit user query

## Mandatory reject conditions

Regardless of score, reject if:

- canonical source cannot be established
- source origin is unclear
- item is classified as explicit noise
- blocked domain applies
- metadata is malformed beyond useful recovery
- content is duplicate clutter with no archival value

## Review queue conditions

An item should go to review instead of reject when:

- provenance is mostly clear but score is mid-range
- secondary material adds useful context and cites primary sources
- technical commentary is meaningful but not primary
- forum discussion includes strong source links
- topic relevance is high but trust is below auto-admit threshold

Review items are not authoritative vault records until approved.

## Admission policy modes

### strict
Designed for source-first archival.

Admit:
- official docs
- GitHub repos/releases
- arXiv papers
- canonical primary materials
- high-trust digests built from trusted records

Review:
- well-cited secondary analysis
- strong forum threads with source links

Reject:
- most secondary summaries
- weak commentary
- noisy media

### balanced
Allows more contextual material.

Admit:
- strict-mode items
- selected high-quality secondary analysis with clear provenance

Review:
- medium-trust contextual materials

Reject:
- unsupported or engagement-driven material

### broad
Broader discovery with still-conservative archival.

Admit:
- strong primary and secondary items that pass threshold

Review:
- more contextual candidates

Reject:
- blocked, noisy, or low-trust items

## Admission data model

```ts
type VaultAdmissionDecision = {
  itemId: string
  decision: 'admit' | 'review' | 'reject'
  reasonCodes: string[]
  trustScore: number
  policyMode: 'strict' | 'balanced' | 'broad'
  admittedAt?: string
  reviewerRequired: boolean
}
```

## Reason codes

Suggested codes:
- PASSED_STRICT_POLICY
- PASSED_BALANCED_POLICY
- HIGH_TRUST_PRIMARY_SOURCE
- HAS_CANONICAL_SOURCE
- REVIEW_REQUIRED
- NO_CANONICAL_SOURCE
- LOW_TRUST
- BLOCKED_DOMAIN
- NOISE_FILTER_BLOCK
- DUPLICATE_LOW_VALUE
- MALFORMED_METADATA
- LOW_TOPIC_RELEVANCE

## What enters the authoritative vault

When admitted, the vault should store:

- normalized source record
- artifact record
- event record if relevant
- trust score result
- admission decision record
- provenance links
- timestamps
- raw payload reference if needed

This preserves auditability.

## Relationship to export targets

Vault admission does not guarantee export to all targets.

After admission:
- raw local vault: usually yes
- Obsidian: usually yes for readable items
- Notebook: maybe, based on topic or bundle request
- Notion: maybe, based on sync settings
- USB: only for higher-trust export-eligible records

## Human approval path

Review items may later become admitted if:
- explicitly approved by user
- upgraded by stronger provenance
- re-scored after better metadata resolution
- linked to verified primary source

## Final principle

Discovery can be wide.
The vault must stay narrow enough to trust.
