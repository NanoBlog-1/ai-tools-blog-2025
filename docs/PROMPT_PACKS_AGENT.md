# Updating AI prompt packs using agents

This doc describes how to create and update **AI prompt packs** (the “AI updates” in the $5/mo subscription) using agents—e.g. **Cursor**, a CLI script that calls an LLM, or a scheduled pipeline.

---

## 1. What’s in place

- **Location:** `my-paywall-worker/public/premium/packs/`
- **Format:** Each pack is a **markdown file** with YAML frontmatter (`title`, `date`, `use_case`). Naming: `YYYY-MM-slug.md`.
- **Manifest:** `packs/index.json` lists all packs (`slug`, `title`, `date`, `description`). The premium page loads this and shows links to each pack.
- **Delivery:** Packs are served from **Cloudflare KV** when available (so you can update packs **without redeploying** the worker). The worker falls back to static files in `public/premium/packs/` if a key is missing. Subscribers see “AI prompt packs” on the premium page with links to the latest packs.

---

## 2. Workflow: use an agent to add or update a pack

### Option A: Cursor (or similar) agent

1. **Brief the agent** with a concrete ask, e.g.:
   - “Add a new prompt pack for [theme]. Follow the format in `my-paywall-worker/public/premium/packs/README.md`. Create the .md file and update `packs/index.json`.”
   - “Update the e‑commerce SERP pack with a new prompt for [specific use case]. Keep the same frontmatter and add a new H2 section.”

2. **Agent does:**
   - Create or edit `public/premium/packs/YYYY-MM-slug.md` with the required frontmatter and prompt sections (see README in that folder).
   - Update `public/premium/packs/index.json`: add or edit the entry for that pack (`slug`, `title`, `date`, `description`).

3. **You:** Run **sync to KV** (no deploy): from `my-paywall-worker`, run `npm run sync-packs`. New/updated packs are live for subscribers within about a minute. (First-time setup: create a KV namespace and set its id in `wrangler.jsonc`; see “KV setup” below.)

### Option B: Script + LLM API

1. **Script** (e.g. Node or Python):
   - Takes a **brief** (theme, use case, optional examples).
   - Calls your LLM API with a **system prompt** that says: “You output a valid prompt pack in the format described in packs/README.md. Output only the markdown file content.”
   - Writes the result to `public/premium/packs/YYYY-MM-<slug>.md`.
   - Updates `index.json` (e.g. append new entry or merge by slug).

2. **Run** the script when you want a new pack (or on a schedule). Then run `npm run sync-packs` to push to KV (no deploy).

### Option C: Fully automated pipeline

- **Trigger:** Schedule (e.g. cron) or “new brief” webhook/queue.
- **Steps:** (1) Load brief from config or CMS, (2) call LLM to generate pack markdown, (3) validate frontmatter and structure, (4) write file and update `index.json`, (5) run `npm run sync-packs` to upload to KV (no deploy).
- **Quality:** Prefer a human review step (e.g. PR, or “draft” pack that goes live after approval) before deploy.

---

## 3. Agent instructions (copy-paste for Cursor)

Use this when asking an agent to add a new pack:

```
Create a new AI prompt pack in my-paywall-worker/public/premium/packs/.

1. Read the format in my-paywall-worker/public/premium/packs/README.md.
2. Create a new file YYYY-MM-<slug>.md (e.g. 2025-03-content-clustering.md) with:
   - YAML frontmatter: title, date, use_case
   - 2–4 prompt sections (H2 per prompt, optional "Use when", then a fenced code block with the prompt text)
3. Update packs/index.json: add one entry to the "packs" array with slug, title, date, description (slug = filename without .md).
4. Prompts must be copy-paste ready; use [PASTE_...] only for user-supplied parts.
```

For **updating** an existing pack:

```
Update the prompt pack at my-paywall-worker/public/premium/packs/<slug>.md:
- [Your specific changes, e.g. add a new H2 section, or revise a prompt]
Keep the same frontmatter and README format. If the title or description changed, update packs/index.json for that slug.
```

---

## 4. KV setup (one-time, so packs update without deploy)

1. Create a KV namespace:  
   `cd my-paywall-worker && npx wrangler kv namespace create PROMPT_PACKS`
2. Copy the **id** from the output and put it in `wrangler.jsonc` under `kv_namespaces[0].id` (replace `REPLACE_AFTER_CREATE`).
3. Deploy the worker once: `npm run deploy`.
4. Seed KV from current packs: `npm run sync-packs`.  
   (You can set `PROMPT_PACKS_NAMESPACE_ID` in env instead of editing wrangler if you prefer.)

After this, **adding or updating packs does not require a deploy**: edit or add files under `public/premium/packs/`, update `index.json`, then run `npm run sync-packs`. Subscribers see updates within about a minute.

---

## 5. Checklist after a new pack

- [ ] New file is in `public/premium/packs/` with name `YYYY-MM-slug.md`.
- [ ] Frontmatter has `title`, `date`, `use_case`.
- [ ] `index.json` has a matching entry (same `slug`, sensible `title` and `description`).
- [ ] Run **`npm run sync-packs`** (no deploy). Premium page will show the new pack (it loads from KV).

---

## 6. Optional: versioning and rollback

- Keep packs in Git; tag or branch per “release” of packs if you want rollback.
- To hide a pack without deleting it: remove its entry from `index.json`, then run `npm run sync-packs` so KV’s index no longer lists it. The file can stay for history.
