# SourceVault

## Product identity

SourceVault is not an AI dashboard, not a chatbot shell, and not a futuristic marketing interface.

SourceVault is a source-first research workspace:
- source-first
- evidence-first
- low-noise
- built for tracking, saving, verifying, and revisiting primary information
- closer to a research inbox, archive, and monitoring workbench than a glossy AI product

The product must feel:
- true
- calm
- grounded
- rigorous
- trustworthy
- durable

It must NOT feel:
- flashy
- futuristic
- glowing
- overly animated
- decorative for decoration's sake
- like a generic AI SaaS template

## Core product goals

Build a system that:
1. discovers primary sources
2. tracks updates over time
3. preserves provenance with metadata and timestamps
4. saves high-trust items into a personal research vault
5. sends low-noise digests instead of addictive feeds
6. makes every important item easy to trace and verify via direct return-to-source links

## Product pillars

### 1. Source-first
Prefer official sites, GitHub repositories, arXiv, Crossref, release pages, documentation pages, and direct primary materials.

### 2. Evidence-first
Every major statement in the product should be traceable back to its source.

### 3. Calm UX
The product is a professional work interface, not an entertainment surface.

### 4. Density with clarity
High information density is welcome, but it must remain legible, structured, and calm.

### 5. Durable UI
The UI should age well. Avoid trend-driven styling.

## Design doctrine

Design for truth, not vibe.

Prioritize:
- structure over spectacle
- typography over decoration
- spacing rhythm over visual tricks
- borders and grouping over floating shadows
- tables, timelines, lists, and logs over giant cards
- directness over theatricality

Default mental model:
- research inbox
- document workspace
- archive console
- evidence ledger
- editorial tool
- systems control surface

Avoid default mental model:
- AI copilot dashboard
- sci-fi operating system
- neon agent control room
- crypto terminal aesthetic
- startup landing page look

## Hard visual bans

Do NOT introduce these unless explicitly approved:
- glassmorphism
- heavy blur backgrounds
- neon glows
- purple-blue hero gradients
- oversized rounded cards
- floating shadow stacks
- animated breathing or pulsing UI
- decorative particles
- empty oversized hero sections
- oversized chat bubbles as main layout
- giant gradient CTA buttons
- fake futuristic panels
- excessive icon decoration
- oversaturated accent colors
- glossy dark-mode clichés

## Visual direction

Preferred:
- restrained monochrome or near-monochrome base
- subtle neutral palette
- sparse but meaningful accent colors
- crisp dividers
- controlled spacing
- visible information hierarchy
- real tables and timelines
- sober interaction feedback
- minimal motion
- strong typography
- narrow radius
- low shadow or no shadow

## Typography rules

- Typography should carry the interface.
- Headings should be calm, not loud.
- Body text should be highly readable.
- Avoid giant display text unless absolutely necessary.
- Prefer clean, professional, editorial, or tool-like rhythm over startup marketing scale.

## Layout rules

- Use grid before decoration.
- Use alignment before animation.
- Use spacing before color.
- Use grouping before borders become noisy.
- The default page should look credible even in grayscale.

## UI component rules

Buttons:
- practical, compact, clear
- never oversized unless functionally required

Cards:
- use sparingly
- prefer panels, lists, tables, rows, and structured sections
- avoid "card soup"

Charts:
- use only when charts reveal change more clearly than tables
- avoid decorative analytics

Search:
- should feel like a work entry point, not a chatbot fantasy gateway

Tables:
- first-class citizen
- support dense scanning, source type, timestamps, trust score, and update time

## Frontend implementation rules

Use a design token system.

Create reusable primitives first.

Do NOT jump straight into polished full pages before:
1. tokens
2. type scale
3. spacing scale
4. layout primitives
5. data display components
6. states
7. final pages

Always build in this order:
1. design tokens
2. typography
3. spacing and grid
4. basic primitives
5. data components
6. page shells
7. product pages

## Product pages to build first

1. Dashboard
2. Search
3. Topic detail
4. Artifact detail
5. Vault
6. Inbox

## Engineering priorities

Start with:
- backend schema
- connectors
- event ingestion
- vault data model
- source trust scoring
- event timeline
- digest generation

Then build UI around real data shapes, not fake placeholder marketing blocks.

## Working style

When designing or generating UI:
- always explain why each page exists
- always prefer honest utility over visual theater
- always critique your own output for "AI smell"
- if a screen starts to look like a generic AI dashboard, redesign it

## Self-critique checklist

Before finalizing any frontend work, ask:
1. Does this look too much like a generic AI product?
2. Would this still look good if all color were removed?
3. Is the structure carrying the design, or just gradients and cards?
4. Is this truly useful or merely visually impressive?
5. Does this screen communicate trust and source integrity?

If in doubt, simplify.
Remove decoration.
Strengthen structure.
Increase truthfulness.

## Output discipline

When implementing:
- return actual files
- do not stop at vague summaries
- do not leave critical TODOs for core product areas
- prefer shipping a calm, plain, solid interface over a flashy unfinished one
