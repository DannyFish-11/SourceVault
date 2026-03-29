# SourceVault PRD

## Product summary

SourceVault is a source-first research vault that continuously discovers, tracks, validates, saves, and surfaces primary information with low-noise delivery.

It combines:
- source discovery
- evidence preservation
- periodic digest inbox
- topic trust ranking
- personal vault storage
- topic tracking
- event timeline

## Core users

Primary user:
- research-heavy technical user
- follows GitHub projects, papers, tools, and official updates
- dislikes forwarded information and noisy media layers
- wants direct return-to-source access

## Main jobs to be done

1. Find original sources faster
2. Reduce loss from retelling and forwarding
3. Aggregate trusted updates into one place
4. Save important findings automatically
5. Revisit and compare changes over time
6. Receive fewer but better pushes

## MVP pages

### Dashboard
- today's new items
- high-trust items
- topic movement
- pending review queue
- daily digest preview

### Search
- source-first results
- subscribe to topic
- save to vault
- filter by source type
- filter by trust

### Topic detail
- topic timeline
- linked artifacts
- source map
- trust view
- update history

### Artifact detail
- source metadata
- summary
- related topic
- event history
- direct source link

### Vault
- saved items
- collections
- tags
- status
- revisit later

### Inbox
- daily digests
- weekly digests
- alerts
- review requests

## Core entities

- Topic
- Source
- Artifact
- Event
- Digest
- Signal
- Collection

## Source priorities

Highest priority:
- official site
- GitHub repo / release / docs
- arXiv
- Crossref / DOI metadata

Lower priority:
- blogs without direct source support
- forum discussion
- media recap

Default exclusions:
- short video platforms
- engagement-first feeds
- low-evidence aggregation

## Trust logic

Trust score should consider:
- source type
- directness
- publication clarity
- event freshness
- relation to tracked topic
- duplication risk
- source traceability

## Product UX principles

- search is not the only entry point
- updates can enter through monitoring
- important items can auto-save to the vault
- every important result must be traceable back to source

## Implementation order

1. backend schemas
2. source connectors
3. event ingestion
4. trust scoring
5. vault save flow
6. dashboard
7. topic page
8. artifact page
9. inbox digests
10. refinements
