---
title: "E-commerce SERP prompts"
date: "2025-02-01"
use_case: "e-commerce SERP analysis"
---

Use these in ChatGPT, Claude, or Gemini. Paste your URL or keywords where indicated. Ask the model to keep the output in the exact format requested so you can drop it into a brief or spreadsheet.

---

## 1. Product or category page SERP brief

**When to use:** You have a live product or category URL and need a one-page brief before rewriting or optimizing.

**Paste this, then replace [YOUR_URL] with the page URL (e.g. yoursite.com/category/running-shoes):**

```
You are an e-commerce SEO specialist. For this URL, produce a one-page SERP brief.

URL: [YOUR_URL]

Assume I will look up the top 10 organic results myself (or have already). Your job is to define the frame.

Output in this exact structure:

1. **Primary query** -- The one search phrase this page should clearly target (one line).

2. **Search intent** -- In one sentence: is this mainly informational, commercial (research/comparison), or transactional? What does the user want at this moment?

3. **SERP shape** -- In 2-3 bullets: what's in the SERP besides the blue links? (e.g. People Also Ask, comparison table, image pack, featured snippet, ads.) What content type is winning?

4. **Top 3 competitors (by position)** -- For each: domain, page type (category/product/article), and in one line what they do better or different.

5. **Content gaps** -- 3 specific gaps: something the top results don't cover well that this page could own (with a suggested H2 or section name).

6. **3 prioritized actions** -- Numbered. Each = one concrete change (e.g. "Add a comparison table under H2: X", "Rewrite meta description to include [phrase]", "Add a FAQ section answering: ..."). No vague advice.
```

---

## 2. Category keyword clustering (intent + target page)

**When to use:** You have a list of keywords (from a tool export or a brainstorm) and need to group them by intent and assign each cluster to a page type.

**Paste this, then replace [KEYWORDS] with your list (one per line or comma-separated):**

```
You are an e-commerce SEO specialist. Cluster these keywords by search intent and assign a target page type.

Keywords:
[KEYWORDS]

Use these intent labels: Informational | Commercial (research/comparison) | Transactional (buy/price).

Output a table with these columns:
| Cluster name (short) | Intent | Example keywords (3-5) | Best target page type (category / product / blog) | One content angle (e.g. "best X for Y", "X vs Y", "how to choose X") |

Then add:
- **Priority** -- Which 2 clusters should we tackle first for this site, and why in one sentence each?
```

---

## 3. Competitor titles & meta -> your title, meta, H1

**When to use:** You know the main query (or have the top 10 list). You want title tag, meta description, and H1 options that fit the intent but stand out.

**Paste this, then replace [QUERY] with the target search phrase:**

```
You are an e-commerce SEO specialist. For the query "[QUERY]":

1. **Assume the top 10 results** -- Without looking them up, infer what typical titles and meta descriptions look like for this intent (informational vs commercial vs transactional). List 3-5 "typical" title patterns and 2-3 "typical" meta patterns in one line each.

2. **Then propose for our page:**
   - **Title tag (under 60 chars):** 2 options. For each, one sentence on how it's different from the "typical" pattern.
   - **Meta description (under 155 chars):** 2 options. Same: one sentence on differentiation.
   - **H1:** 2 options. Clear, intent-matching, and specific (not generic "Best X" unless the SERP favors that).
```

---

## 4. SERP feature checklist (what to build into the page)

**When to use:** You've seen the SERP (or the model has inferred it). You want a short checklist of on-page elements that could capture features (featured snippet, PAA, comparison block, etc.).

**Paste this, then replace [QUERY] and optionally [PAGE_TYPE] (e.g. "product page" or "category page"):**

```
For the query "[QUERY]", this is a [PAGE_TYPE].

List SERP features that often appear for this kind of query (People Also Ask, featured snippet, comparison table, image pack, video, etc.). For each feature:

- **Feature name**
- **What to add on our page** (one concrete element: e.g. "FAQ section with clear H2s and 40-60 word answers", "Table comparing 3-5 options with columns X, Y, Z")
- **One example question or heading** we could use

Keep it to 4-6 features. Output as a simple checklist so I can tick off as we implement.
```

---

*Use these prompts with your real URLs and keyword lists. For best results, paste the model's output into a doc or Notion so your team can assign and track the actions.*
