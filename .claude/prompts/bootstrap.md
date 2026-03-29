Build the complete SourceVault MVP in this repository.

Read and obey:
- CLAUDE.md
- docs/design-philosophy.md
- docs/ui-guardrails.md
- docs/product-prd.md

Also consult these agents before finalizing frontend work:
- .claude/agents/ui-art-director.md
- .claude/agents/frontend-critic.md

Core instruction:
SourceVault is not an AI dashboard.
Do not generate generic AI SaaS UI.
Do not use flashy gradients, glassmorphism, glows, floating card soup, or empty hero sections.

Build a calm, truthful, source-first research workspace.

Implementation priorities:
1. Create the backend models and API structure
2. Create source-first data models
3. Build Dashboard, Search, Topic, Artifact, Vault, and Inbox
4. Use real component primitives and data display patterns
5. Keep the UI restrained, dense, and trustworthy

UI requirements:
- grayscale-first credibility
- low saturation
- narrow radii
- minimal shadow
- strong typography
- rows / tables / timelines as first-class patterns
- easy return-to-source links
- direct trust and evidence display

For every major frontend page:
- produce the file
- explain the layout briefly
- run a self-critique
- simplify if it feels too AI-like

Do not stop with a proposal.
Generate actual project files.
