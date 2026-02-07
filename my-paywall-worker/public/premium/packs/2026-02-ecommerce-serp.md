---
title: "E-commerce SERP & AI Overview prompts (2026)"
date: "2026-02-01"
use_case: "e-commerce SERP and AI answer visibility"
---

Use these in ChatGPT, Claude, or Gemini. Paste your URL or keywords where indicated. Output formats are designed so you can drop results into a brief or spreadsheet. These prompts assume 2026 SERPs: AI Overviews, answer-style results, and traditional blue links all matter.

---

## 1. Product or category page SERP brief (2026)

**When to use:** You have a live product or category URL and need a one-page brief before rewriting or optimizing.

**Paste this, then replace [YOUR_URL] with the page URL:**

```
You are an e-commerce SEO specialist in 2026. For this URL, produce a one-page SERP brief.

URL: [YOUR_URL]

Assume I will check the live SERP myself. Your job is to define the frame for 2026: blue links plus AI Overview / answer-style results where relevant.

Output in this exact structure:

1. **Primary query** -- The one search phrase this page should clearly target (one line).

2. **Search intent** -- One sentence: informational, commercial (research/comparison), or transactional? What does the user want right now?

3. **SERP shape (2026)** -- Bullets: (a) What traditional features appear? (PAA, featured snippet, comparison table, images, video.) (b) For this query type, do AI Overviews or answer-style results typically appear? If yes, what kind of source (lists, comparisons, definitions)? (c) What content type is winning in the organic results?

4. **Top 3 competitors** -- For each: domain, page type, one line on what they do better or different.

5. **Content gaps** -- 3 specific gaps the top results don't cover well, with a suggested H2 or section name for each.

6. **3 prioritized actions** -- Numbered. Each = one concrete change (on-page element or content addition). No vague advice. If AI Overviews are relevant for this query type, include one action that could help our page be cited (e.g. clear definition, comparison table, step list).
```

---

## 2. Category keyword clustering (intent + target page)

**When to use:** You have a list of keywords and need to group by intent and assign a target page type.

**Paste this, then replace [KEYWORDS] with your list:**

```
You are an e-commerce SEO specialist. Cluster these keywords by search intent and assign a target page type.

Keywords:
[KEYWORDS]

Use these intent labels: Informational | Commercial (research/comparison) | Transactional (buy/price).

Output a table:
| Cluster name (short) | Intent | Example keywords (3-5) | Best target page type (category / product / blog) | One content angle (e.g. "best X for Y", "X vs Y", "how to choose X") |

Then add:
- **Priority** -- Which 2 clusters should we tackle first, and why in one sentence each?
```

---

## 3. Competitor titles & meta -> your title, meta, H1

**When to use:** You know the main query and want title, meta, and H1 options that fit intent but stand out.

**Paste this, then replace [QUERY]:**

```
You are an e-commerce SEO specialist. For the query "[QUERY]":

1. **Typical SERP** -- Infer what typical titles and meta descriptions look like for this intent. List 3-5 "typical" title patterns and 2-3 "typical" meta patterns in one line each.

2. **Propose for our page:**
   - **Title tag (under 60 chars):** 2 options. For each, one sentence on how it's different from the typical pattern.
   - **Meta description (under 155 chars):** 2 options. Same: one sentence on differentiation.
   - **H1:** 2 options. Clear, intent-matching, and specific.
```

---

## 4. SERP feature checklist (what to build into the page)

**When to use:** You want a checklist of on-page elements that could capture SERP features (including answer-style visibility where relevant).

**Paste this, then replace [QUERY] and [PAGE_TYPE] (e.g. "product page" or "category page"):**

```
For the query "[QUERY]", this is a [PAGE_TYPE]. We're optimizing for 2026 SERPs (blue links + AI Overviews / answer-style where relevant).

List 4-6 SERP features that often appear for this query type. For each:

- **Feature name** (e.g. People Also Ask, featured snippet, comparison table, AI Overview / answer-style)
- **What to add on our page** (one concrete element: e.g. "FAQ with clear H2s and 40-60 word answers", "Comparison table with columns X, Y, Z")
- **One example question or heading** we could use

Output as a simple checklist I can tick off as we implement.
```

---

## 5. AI Overview / answer-style brief (when the query gets an AI answer)

**When to use:** The target query often shows an AI Overview or answer-style result. You want a short brief on how to make our page more likely to be cited or linked.

**Paste this, then replace [QUERY]:**

```
For the query "[QUERY]", assume Google (or another engine) often shows an AI Overview or answer-style result above the blue links.

You are an SEO specialist. Produce a short "answer visibility" brief:

1. **What the AI answer usually includes** -- In 2-3 bullets: typical format (list, comparison, definition, steps?) and what sources it tends to cite (brands, reviews, guides, etc.).

2. **Entity and clarity** -- One sentence: what entity or concept should our page clearly define or claim (so we're a candidate for citation)? One sentence: what one thing should our page state clearly in the first 100 words?

3. **3 on-page actions** -- Numbered. Concrete changes that could help (e.g. "Add a clear definition in the first paragraph", "Add a numbered list: ‘How to choose X' with 4-5 steps", "Add a comparison table with 3-5 options"). No vague advice.
```

---

*Use these with your real URLs and keyword lists. Paste the model's output into a doc or Notion so your team can assign and track the actions.*
