# Prompt pack format (for agents)

Each **pack** is a markdown file in this folder. Naming: `YYYY-MM-slug.md` (e.g. `2025-02-ecommerce-serp.md`).

## Required frontmatter (YAML at top of file)

```yaml
---
title: "Short title for the pack"
date: "YYYY-MM-DD"
use_case: "e.g. e-commerce SERP, blog clustering, competition scoring"
---
```

## Body structure

- **One H2 per prompt** (e.g. `## Product page SERP brief`).
- Under each H2: optional short "Use when" line, then a fenced block with the prompt text (no language tag, or `text`).
- Prefer copy-paste ready prompts; avoid placeholders unless documented.

## Example

```markdown
---
title: "E-commerce SERP prompts"
date: "2025-02-01"
use_case: "e-commerce SERP analysis"
---

## Product page SERP brief

Use when: you have a product or category URL and want a one-pager for the model.

```
You are an SEO analyst. For the following product/category page URL, analyze the current SERP (top 10) and produce a one-page brief: intent, top competitors, content gaps, and 3 concrete recommendations. URL: [PASTE_URL]
```

## Category clustering prompt

...
```

## Manifest: index.json

After adding or updating a pack, **update `index.json`** in this folder:

- Add or edit an object in the `packs` array: `slug` (filename without .md), `title`, `date`, `description`.
- Slug must match the pack filename (e.g. `2025-02-ecommerce-serp` for `2025-02-ecommerce-serp.md`).

Agents (e.g. Cursor) should generate the .md file and then update index.json so the premium page shows the new pack.
