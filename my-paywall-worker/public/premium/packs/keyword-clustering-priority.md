---
title: "Keyword Clustering + Priority Prompts"
date: "2026-02-01"
use_case: "keyword clustering and prioritization"
---

Use these in ChatGPT, Claude, or Gemini. Paste your keyword list where indicated. Outputs are designed to drop into a spreadsheet or Notion.

---

## 1. Cluster keywords by intent

**When to use:** You have a list of keywords and need to group them by search intent (informational, commercial, transactional).

**Paste this, then replace [KEYWORDS] with your list:**

```
You are an SEO specialist. Cluster these keywords by search intent.

Keywords:
[KEYWORDS]

For each keyword, output:
1. Keyword (exact phrase)
2. Intent: informational | commercial | transactional
3. One-line reason

Output as a table or list I can paste into a spreadsheet. Keep the same order as the input list.
```

---

## 2. Score difficulty and prioritize

**When to use:** You have clustered keywords and need a prioritized list (what to tackle first).

**Paste this, then replace [KEYWORD_LIST] with your clustered list:**

```
You are an SEO specialist. I have keywords already clustered by intent. Score each for difficulty (low/medium/high) and opportunity (low/medium/high), then output a single prioritized list: what to optimize or write first, with a one-line justification per item.

Keyword list (with intent):
[KEYWORD_LIST]

Output: Rank, Keyword, Intent, Difficulty, Opportunity, Priority reason. Format so I can paste into a spreadsheet.
```

---

Copy the prompts above into ChatGPT, Claude, or Gemini, then replace the placeholders with your data.
