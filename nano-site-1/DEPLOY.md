# Deploy nano-site-1 to Cloudflare Pages

Two ways to get your landing page live at **best-ai-tools-for-keyword-research-2025.xyz**.

---

## Option A: Deploy from your computer (CLI)

### One-time setup

1. **Log in to Cloudflare** (if you haven’t):
   ```bash
   npx wrangler login
   ```
   A browser window opens; sign in and allow access.

2. **Create a Pages project** (once per site):
   ```bash
   npx wrangler pages project create best-ai-tools-2025
   ```
   Use any name you like (e.g. `best-ai-tools-2025`). You’ll get a URL like `https://best-ai-tools-2025.pages.dev`.

### Every time you want to deploy

From the **project root** (parent of `nano-site-1`):

```bash
npx wrangler pages deploy nano-site-1 --project-name=best-ai-tools-2025
```

Or from **inside** `nano-site-1` (run `npm install` once first):

```bash
cd nano-site-1
npm install
npm run deploy
```

Use the same `--project-name` you chose in step 2. After deploy, the site is live at `https://best-ai-tools-2025.pages.dev` (or whatever name you used).

### Add your custom domain

1. In [Cloudflare Dashboard](https://dash.cloudflare.com) go to **Workers & Pages** → your Pages project (**best-ai-tools-2025**).
2. Open **Custom domains** → **Set up a custom domain**.
3. Enter **best-ai-tools-for-keyword-research-2025.xyz**.
4. Follow the steps (add the CNAME or nameservers at your domain registrar if the domain isn’t already on Cloudflare).

---

## Option B: Deploy from the Cloudflare dashboard (Direct Upload)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** or **Direct Upload**.
2. Choose **Direct Upload**.
3. Project name: e.g. **best-ai-tools-2025**.
4. **Create project**.
5. In the **Deployments** tab, click **Upload assets**.
6. Select **all files and folders** inside `nano-site-1` (e.g. `index.html`, `image1.jpg`, …, `image5.jpg`).  
   You can drag the contents of the `nano-site-1` folder, or zip the folder and upload (if the UI allows zip).
7. Deploy. The site will be live at `https://best-ai-tools-2025.pages.dev`.
8. Add your custom domain as in **Option A → Add your custom domain**.

---

## After deploy

- **AdSense:** Your AdSense snippet is in `index.html`. Once the site is live at **best-ai-tools-for-keyword-research-2025.xyz**, run **Verify** again in AdSense.
- **Paywall:** The “Pay” buttons on the nano-site point to your paywall worker (e.g. `https://my-paywall-worker.workers.dev/premium/`). No change needed unless you use a different worker URL.
