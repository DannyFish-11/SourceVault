# SourceVault Search Orchestration Specification

## Purpose

Search orchestration controls how SourceVault coordinates multiple connectors and query strategies.

It exists to:
- avoid ad hoc source fetching
- prioritize primary sources
- reuse tracked-topic context
- combine discovery with restraint
- produce candidates suitable for scoring and vault admission

## Core principle

Search should be source-first and staged.

Do not search everything equally.
Do not let broad discovery replace primary-source retrieval.

## Search layers

SourceVault search should be organized into 4 layers:

1. Direct source retrieval
2. Primary-source expansion
3. Supplemental discovery
4. Review-only context retrieval

## 1. Direct source retrieval

This layer is used when the user already has a known source target.

Examples:
- specific GitHub repo
- specific arXiv paper
- specific official domain
- specific saved topic

Priority:
highest

Typical connectors:
- GitHub
- arXiv
- direct source resolver

## 2. Primary-source expansion

This layer finds more primary materials related to a tracked topic.

Examples:
- related GitHub releases
- same arXiv topic/category
- official docs linked from repo
- official announcement pages

Priority:
high

Typical connectors:
- GitHub
- arXiv
- source resolver
- selected allowed domains

## 3. Supplemental discovery

This layer finds likely useful candidate sources beyond direct subscriptions.

Examples:
- Perplexity search for official/canonical pages
- cross-source discovery for missing docs
- related project-page discovery

Priority:
medium

Typical connectors:
- Perplexity
- optional future web discovery connectors

These results must never bypass trust and noise filtering.

## 4. Review-only context retrieval

This layer gathers contextual materials that may help review but are not primary archival candidates by default.

Examples:
- technical blog analysis
- forum discussion with strong links
- well-cited secondary explanation

Priority:
low

These items usually route to review, not automatic archival.

## Query construction

Queries should come from:

- explicit user search
- tracked topics
- saved artifacts
- behavior-signal-assisted refinements
- connector-specific expansion logic

## Query strategy model

```ts
type SearchPlan = {
  topicId?: string
  baseQuery: string
  layers: Array<'direct' | 'primary' | 'supplemental' | 'review'>
  connectors: Array<'github' | 'arxiv' | 'perplexity'>
  priority: 'high' | 'medium' | 'low'
}
```

## Recommended orchestration order

For a tracked topic:

1. resolve known sources first
2. query GitHub connector
3. query arXiv connector
4. merge and dedupe results
5. if coverage is weak, invoke Perplexity connector
6. optionally fetch review-only context
7. pass all candidates into normalization and scoring pipeline

## Dedupe rules

Before scoring, dedupe candidates by:

- canonical URL
- stable source identifier
- normalized title + source domain
- repo or paper identifier if available

## Coverage heuristics

Use broader discovery only if needed.

Examples of when to broaden:
- no primary candidates found
- topic appears under-specified
- tracked topic has new activity but no direct source update resolved
- explicit user search asks for broader landscape

## Scheduling integration

Tracked topics should be prioritized by:

- explicit user follow/pin
- freshness of last updates
- behavior-signal interest weight
- past high-value results
- manual importance flag

Behavior signals may change search priority, not admission rules.

## Output contract

Search orchestration should produce a normalized candidate batch.

```ts
type SearchBatch = {
  planId: string
  topicId?: string
  baseQuery: string
  executedAt: string
  candidates: NormalizedCandidate[]
  connectorStats: Record<string, number>
}
```

This batch then goes to:
- trust scoring
- noise filtering
- vault admission

## Failure behavior

If one connector fails:
- continue with others when possible
- log connector failure
- mark runtime degraded if repeated
- do not collapse the whole search cycle

## Final principle

Search orchestration should make SourceVault feel deliberate, not frantic.
It should search broadly only when needed, and always return to primary-source discipline before archival decisions are made.
