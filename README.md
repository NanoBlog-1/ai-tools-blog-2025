Repo for best-ai-tools-for-keyword-research-2025.xyz – AI keyword research tools blog with Solana paywall.

## Project layout

- **nano-site-1** — Static landing page (HTML/CSS/JS) for the AI SEO offer. Deploys to Cloudflare Pages. All “Pay” / “Get access” links point to the paywall worker. See [nano-site-1/DEPLOY.md](nano-site-1/DEPLOY.md) for deploy steps and custom domain setup.

- **my-paywall-worker** — Cloudflare Worker that serves the premium paywall (card, Apple Pay, Solana), premium content, and privacy page. See [my-paywall-worker/TERMINAL.md](my-paywall-worker/TERMINAL.md) for dev, deploy, and worker docs.
