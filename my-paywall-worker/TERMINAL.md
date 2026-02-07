# my-paywall-worker — Terminal commands (copy & paste)

Use these from the **project root** (`ai-tools-blog-2025`) or from **my-paywall-worker** as noted.

---

## 1. Go to the worker folder

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
```

---

## 2. Install dependencies (first time or after pull)

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
npm install
```

---

## 3. Run locally (dev server)

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
npm run dev
```

Then open: **http://localhost:8787** and **http://localhost:8787/premium/** to test the paywall.

**To see the paywall again (e.g. to test Stripe):** When you’re on the premium page (unlocked), click **“Clear access (show paywall again)”** at the bottom, or go to: **http://localhost:8787/premium/?clear=1**

---

## 4. Set Stripe secret (for Pay $2 to work)

**Option A — Local dev only (easiest for testing)**  
Create a file `.dev.vars` in this folder with your Stripe **test** key (get it from https://dashboard.stripe.com/test/apikeys):

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
echo 'STRIPE_SECRET_KEY=sk_test_PASTE_YOUR_KEY_HERE' > .dev.vars
```

Then edit `.dev.vars` and replace `sk_test_PASTE_YOUR_KEY_HERE` with your real `sk_test_...` key. Don’t commit `.dev.vars` (it’s gitignored).

**Option B — Deployed worker: set secret for production**  
For **real card charges** in production, set the **live** Stripe secret (get it from https://dashboard.stripe.com/apikeys — use **Live** mode, not Test):

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
npx wrangler secret put STRIPE_SECRET_KEY
```

When prompted, paste your **live** key (`sk_live_...`). This is stored as a secret in Cloudflare and is used when the worker runs in production. For local dev, keep `sk_test_...` in `.dev.vars` only.

If Wrangler asks “create a new Worker?”, type **Y** and press Enter, then run `npm run deploy`.

---

## 5. Deploy to Cloudflare

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
npm run deploy
```

After deploy, your paywall URL will be: **https://my-paywall-worker.workers.dev/premium/** (or the subdomain Wrangler prints).

---

## 6. Update prompt packs without redeploying (KV)

Prompt packs are served from **KV** when configured, so you can add or change packs and have them live in ~1 minute without deploying.

**One-time setup:** Create a KV namespace and put its id in `wrangler.jsonc`:

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
npx wrangler kv namespace create PROMPT_PACKS
```

Copy the **id** from the output and in `wrangler.jsonc` set `kv_namespaces[0].id` to that value (replace `REPLACE_AFTER_CREATE`). Then deploy once: `npm run deploy`.

**Whenever you add or edit packs** (e.g. new file in `public/premium/packs/` and update `index.json`):

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
npm run sync-packs
```

No deploy needed. Subscribers see the new/updated packs shortly.

---

## 7. One-liners (if you’re already in the worker folder)

```bash
npm run dev
```

```bash
npm run deploy
```

```bash
npx wrangler secret put STRIPE_SECRET_KEY
```

```bash
npm run sync-packs
```

---

## 8. Full flow: install → dev

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
npm install
npm run dev
```

---

## 9. Full flow: deploy (after Stripe secret is set)

```bash
cd "/Users/davidoliva/Desktop/Business Apps/ai-blog-project/ai-tools-blog-2025/my-paywall-worker"
npm run deploy
```
