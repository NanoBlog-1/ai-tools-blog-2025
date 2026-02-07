const RECIPIENT_PUBKEY = 'Bw2M5DqDsHsNZhGbmyj8WQ9iX55Gk8RPrmxpQj35aUxM';
const STRIPE_PRICE_CENTS = 200; // $2 one-time
const STRIPE_SUBSCRIPTION_CENTS = 500; // $5/month AI updates
const STRIPE_API = 'https://api.stripe.com/v1';

const PUBLIC_SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

function getSolanaRpcUrl(apiKey?: string): string {
	if (apiKey && apiKey.trim()) return 'https://mainnet.helius-rpc.com/?api-key=' + encodeURIComponent(apiKey.trim());
	return PUBLIC_SOLANA_RPC;
}

/** Inline fallback when ASSETS does not serve /privacy.html (e.g. dev or deploy quirk). */
const PRIVACY_HTML = (origin: string) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Privacy &amp; Security — Premium AI Keyword Tools</title>
	<style>
		body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; background: #0d0d0f; color: #e4e4e7; line-height: 1.6; }
		h1 { color: #9945ff; font-size: 1.5rem; margin-bottom: 1rem; }
		h2 { font-size: 1.1rem; color: #e4e4e7; margin-top: 1.5rem; margin-bottom: 0.5rem; }
		p, li { color: #71717a; margin-bottom: 0.75rem; }
		a { color: #9945ff; text-decoration: none; }
		a:hover { text-decoration: underline; }
		ul { padding-left: 1.25rem; }
		.back { margin-top: 2rem; font-size: 0.9rem; }
	</style>
</head>
<body>
	<h1>Privacy &amp; Security</h1>
	<p>Your security and privacy matter. Here's how we handle your data.</p>
	<h2>What we collect</h2>
	<ul>
		<li><strong>Payment proof only:</strong> To grant access after payment, we store a transaction signature (Solana) or a Stripe session ID in a cookie on your device. We do not store your card number, wallet address, or other payment details on our servers.</li>
		<li><strong>No account required:</strong> You do not create an account or give us your email unless you choose to.</li>
	</ul>
	<h2>How payments work</h2>
	<ul>
		<li><strong>Card / Apple Pay:</strong> Processed by <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe</a>. We never see or store your card details. Stripe's privacy policy applies to payment data.</li>
		<li><strong>Solana:</strong> Payment is sent on the blockchain to our wallet. The transaction is public on the network; we only use the signature to verify payment and grant access.</li>
	</ul>
	<h2>Cookies</h2>
	<p>We use a single cookie to remember that you have paid, so you can access premium content without paying again. This cookie is stored only on your device, is not used for advertising or tracking, and is not shared with third parties for marketing.</p>
	<h2>We do not</h2>
	<ul>
		<li>Sell or rent your data</li>
		<li>Use your data for advertising or cross-site tracking</li>
		<li>Store card numbers or full payment details</li>
	</ul>
	<h2>Security</h2>
	<p>Access cookies are set with secure options (e.g. HttpOnly where possible, Secure on HTTPS, SameSite) to reduce the risk of misuse. We do not log or retain payment details beyond what is needed to verify access.</p>
	<p class="back"><a href="${origin}/">← Back to home</a> · <a href="${origin}/premium/">Premium</a></p>
</body>
</html>`;

interface Env {
	ASSETS: { fetch: typeof fetch };
	STRIPE_SECRET_KEY?: string;
	PROMPT_PACKS?: KVNamespace;
	HELIUS_API_KEY?: string;
}

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Fix common typo: /premuim → /premium/
		if (url.pathname === '/premuim' || url.pathname === '/premuim/') {
			return Response.redirect(url.origin + '/premium/', 302);
		}

		// Clean URL: /privacy → privacy.html (fallback inline if asset missing)
		if (url.pathname === '/privacy' || url.pathname === '/privacy/') {
			const privacyRequest = new Request(url.origin + '/privacy.html', { headers: request.headers });
			const privacyResponse = await env.ASSETS.fetch(privacyRequest);
			if (privacyResponse.ok) return privacyResponse;
			const origin = url.origin;
			const fallback = new Response(PRIVACY_HTML(origin), {
				headers: { 'Content-Type': 'text/html; charset=utf-8' },
				status: 200,
			});
			return fallback;
		}

		// Debug: check if Stripe key is loaded (only in dev)
		if (url.pathname === '/api/debug-stripe') {
			const keySet = !!(env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.includes('PASTE_YOUR'));
			return new Response(JSON.stringify({ stripeConfigured: keySet, keyLength: env.STRIPE_SECRET_KEY?.length ?? 0 }), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Stripe: create Checkout Session ($2 one-time, cards + Apple Pay)
		if (request.method === 'POST' && url.pathname === '/api/create-checkout') {
			return handleCreateCheckout(request, env);
		}

		// Stripe: create Subscription Checkout ($5/month AI updates)
		if (request.method === 'POST' && url.pathname === '/api/create-subscription') {
			return handleCreateSubscription(request, env);
		}

		// Solana RPC proxy: so the main site (custom domain) can use Helius without 403 from public RPC
		if (url.pathname === '/api/solana-rpc') {
			if (request.method === 'GET') {
				return new Response(JSON.stringify({ ok: true, rpc: 'proxy', use: 'POST for JSON-RPC' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
				});
			}
			return handleSolanaRpcProxy(request, env);
		}

		// Stripe success: verify session, set cookie, redirect to /premium/
		if (url.pathname.startsWith('/premium/') && url.searchParams.get('stripe') === 'success') {
			const sessionId = url.searchParams.get('session_id');
			if (sessionId && env.STRIPE_SECRET_KEY) {
				const verified = await verifyStripeSession(sessionId, env.STRIPE_SECRET_KEY);
				if (verified) {
					const redirectUrl = url.origin + '/premium/';
					const isLocalhost = url.origin.includes('localhost');
					const cookie = `stripe_paid=${encodeURIComponent(sessionId)}; path=/; max-age=31536000; samesite=lax; httponly${isLocalhost ? '' : '; secure'}`;
					return new Response(null, {
						status: 302,
						headers: {
							'Location': redirectUrl,
							'Set-Cookie': cookie,
						},
					});
				}
			}
			// Fall through to paywall or asset
		}

		// Clear access (for testing): /premium/?clear=1 clears cookies and redirects to paywall
		if (url.pathname.startsWith('/premium/') && url.searchParams.get('clear') === '1') {
			const headers = new Headers();
			headers.set('Location', url.origin + '/premium/');
			headers.append('Set-Cookie', 'auth_token=; path=/; max-age=0; samesite=lax');
			headers.append('Set-Cookie', 'stripe_paid=; path=/; max-age=0; samesite=lax');
			return new Response(null, { status: 302, headers });
		}

		// Protect premium paths
		if (url.pathname.startsWith('/premium/')) {
			const solanaRpcUrl = getSolanaRpcUrl(env.HELIUS_API_KEY);
			const cookie = request.headers.get('Cookie') || '';
			const authTokenMatch = cookie.match(/auth_token=([^;]*)/);
			let authToken = authTokenMatch ? decodeURIComponent(authTokenMatch[1].trim()) : null;
			const stripeMatch = cookie.match(/stripe_paid=([^;]*)/);
			const stripeSessionId = stripeMatch ? decodeURIComponent(stripeMatch[1].trim()) : null;

			// Main site sends ?solana_sig= after payment; verify and set cookie then redirect
			const solanaSig = url.searchParams.get('solana_sig');
			if (solanaSig && !authToken && !stripeSessionId) {
				const isValid = await verifySolanaTx(solanaSig.trim(), solanaRpcUrl);
				if (isValid) {
					const isLocalhost = url.origin.includes('localhost');
					const cookieOpts = `path=/; max-age=31536000; samesite=lax; httponly${isLocalhost ? '' : '; secure'}`;
					return new Response(null, {
						status: 302,
						headers: {
							'Location': url.origin + '/premium/',
							'Set-Cookie': `auth_token=${encodeURIComponent(solanaSig.trim())}; ${cookieOpts}`,
						},
					});
				}
			}

			let hasAccess = false;
			if (authToken) {
				const isValid = await verifySolanaTx(authToken, solanaRpcUrl);
				if (isValid) hasAccess = true;
			}
			if (!hasAccess && stripeSessionId && env.STRIPE_SECRET_KEY) {
				const isValid = await verifyStripeSession(stripeSessionId, env.STRIPE_SECRET_KEY);
				if (isValid) hasAccess = true;
			}
			if (!authToken && !stripeSessionId) {
				return new Response(generatePaywallHTML(url.origin, solanaRpcUrl), {
					headers: { 'Content-Type': 'text/html' },
					status: 402,
				});
			}
			if (!hasAccess) {
				return new Response('Invalid or expired access', { status: 403 });
			}

			// Serve prompt packs from KV when available (no deploy needed to update packs)
			if (request.method === 'GET' && env.PROMPT_PACKS) {
				const isIndex = url.pathname === '/premium/packs/index.json';
				const mdMatch = url.pathname.match(/^\/premium\/packs\/([a-zA-Z0-9_-]+)\.md$/);
				const kvKey = isIndex ? 'packs:index' : mdMatch ? 'packs:' + mdMatch[1] : null;
				const contentType = isIndex ? 'application/json' : mdMatch ? 'text/markdown' : null;
				if (kvKey && contentType) {
					const value = await env.PROMPT_PACKS.get(kvKey);
					if (value !== null) {
						return new Response(value, {
							headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=60' },
						});
					}
				}
			}

			return env.ASSETS.fetch(request);
		}

		return env.ASSETS.fetch(request);
	},
};

async function handleCreateCheckout(request: Request, env: Env): Promise<Response> {
	if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY.includes('PASTE_YOUR_KEY')) {
		return new Response(
			JSON.stringify({
				error: 'Stripe not configured',
				setup: 'In my-paywall-worker folder: edit .dev.vars and set STRIPE_SECRET_KEY=sk_test_... (get key from https://dashboard.stripe.com/test/apikeys). Save, then restart: npm run dev',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
	const origin = new URL(request.url).origin;
	const successUrl = `${origin}/premium/?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
	const cancelUrl = `${origin}/premium/`;

	try {
		const body = new URLSearchParams({
			'mode': 'payment',
			'success_url': successUrl,
			'cancel_url': cancelUrl,
			'payment_method_types[]': 'card',
			'line_items[0][price_data][currency]': 'usd',
			'line_items[0][price_data][unit_amount]': String(STRIPE_PRICE_CENTS),
			'line_items[0][price_data][product_data][name]': 'Premium AI Keyword Tools — Lifetime Access',
			'line_items[0][quantity]': '1',
		});

		const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: body.toString(),
		});

		const text = await res.text();
		if (!res.ok) {
			let errMsg = text;
			try {
				const errJson = JSON.parse(text) as { error?: { message?: string } };
				errMsg = errJson?.error?.message || text;
			} catch {
				// use raw text
			}
			return new Response(JSON.stringify({ error: errMsg || 'Stripe error' }), {
				status: res.status,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const data = JSON.parse(text) as { id?: string; url?: string };
		if (!data.url) {
			return new Response(JSON.stringify({ error: 'No checkout URL from Stripe' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify({ url: data.url }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return new Response(
			JSON.stringify({ error: 'Checkout failed', detail: message }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

async function handleCreateSubscription(request: Request, env: Env): Promise<Response> {
	if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY.includes('PASTE_YOUR_KEY')) {
		return new Response(
			JSON.stringify({
				error: 'Stripe not configured',
				setup: 'In my-paywall-worker: edit .dev.vars and set STRIPE_SECRET_KEY=sk_test_...',
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
	const origin = new URL(request.url).origin;
	const successUrl = `${origin}/premium/?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
	const cancelUrl = `${origin}/premium/`;

	try {
		const body = new URLSearchParams({
			'mode': 'subscription',
			'success_url': successUrl,
			'cancel_url': cancelUrl,
			'payment_method_types[]': 'card',
			'line_items[0][price_data][currency]': 'usd',
			'line_items[0][price_data][unit_amount]': String(STRIPE_SUBSCRIPTION_CENTS),
			'line_items[0][price_data][recurring][interval]': 'month',
			'line_items[0][price_data][product_data][name]': 'AI Keyword Tools — AI updates ($5/mo)',
			'line_items[0][quantity]': '1',
		});

		const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: body.toString(),
		});

		const text = await res.text();
		if (!res.ok) {
			let errMsg = text;
			try {
				const errJson = JSON.parse(text) as { error?: { message?: string } };
				errMsg = errJson?.error?.message || text;
			} catch {
				// use raw text
			}
			return new Response(JSON.stringify({ error: errMsg || 'Stripe error' }), {
				status: res.status,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const data = JSON.parse(text) as { id?: string; url?: string };
		if (!data.url) {
			return new Response(JSON.stringify({ error: 'No checkout URL from Stripe' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify({ url: data.url }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return new Response(
			JSON.stringify({ error: 'Subscription checkout failed', detail: message }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}

/** Proxy JSON-RPC to Solana RPC (Helius when key set) so the main site can avoid 403 from public RPC. */
async function handleSolanaRpcProxy(request: Request, env: Env): Promise<Response> {
	const corsHeaders: Record<string, string> = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
	if (request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders });
	}
	let body: string;
	try {
		body = await request.text();
	} catch {
		return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }), {
			status: 400,
			headers: { 'Content-Type': 'application/json', ...corsHeaders },
		});
	}
	try {
		const rpcUrl = getSolanaRpcUrl(env.HELIUS_API_KEY);
		const res = await fetch(rpcUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
		});
		const text = await res.text();
		return new Response(text, {
			status: res.status,
			headers: { 'Content-Type': 'application/json', ...corsHeaders },
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				error: { code: -32603, message: 'Proxy error: ' + message },
				id: null,
			}),
			{
				status: 502,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			}
		);
	}
}

async function verifyStripeSession(sessionId: string, secretKey: string): Promise<boolean> {
	try {
		const res = await fetch(
			`${STRIPE_API}/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
			{ headers: { 'Authorization': `Bearer ${secretKey}` } }
		);
		if (!res.ok) return false;
		const data = (await res.json()) as {
			mode?: string;
			payment_status?: string;
			subscription?: { status?: string } | string;
		};
		if (data.mode === 'subscription') {
			const sub = data.subscription;
			const status = typeof sub === 'object' && sub !== null ? sub.status : null;
			return status === 'active' || status === 'trialing';
		}
		return data.payment_status === 'paid';
	} catch {
		return false;
	}
}

function generatePaywallHTML(origin: string, solanaRpcUrl: string): string {
	return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Premium AI Tools Access</title>
<!-- Hide AdSense on paywall & any premium pages -->
<script>
  if (window.location.pathname.includes('/premium')) {
    document.documentElement.style.setProperty('--adsense-display', 'none');
  }
</script>
<style>
  ins.adsbygoogle, .adsbygoogle { display: none !important; }
</style>
<style>
  .pay-options{display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center;margin:1rem 0;}
  .pay-btn{display:inline-flex;align-items:center;padding:0.75rem 1.25rem;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;border:none;font-family:inherit;}
  .pay-btn.solana{background:linear-gradient(135deg,#9945ff 0%,#14f195 100%);color:#0d0d0f;}
  .pay-btn.stripe{background:#635bff;color:#fff;}
  .pay-btn.sub{background:#0d0d0f;color:#fff;border:1px solid #2a2a2e;}
  .pay-btn:hover{opacity:0.9;transform:translateY(-1px);}
  .pay-btn:disabled{opacity:0.7;cursor:not-allowed;transform:none;}
  .pay-copy{margin-top:0.5rem;font-size:0.85rem;color:#71717a;}
</style>
</head>
<body style="font-family:system-ui;max-width:560px;margin:2rem auto;padding:0 1rem;">
  <h1>Unlock Exclusive AI Keyword Research Insights</h1>
  <p>One-time: ~$1.50 (Solana) or $2 (card). Or subscribe for ongoing AI updates.</p>
  <div class="pay-options">
    <button type="button" id="paySolana" class="pay-btn solana">~$1.50 (Solana)</button>
    <button type="button" id="payStripe" class="pay-btn stripe">$2 one-time (card or Apple Pay)</button>
    <button type="button" id="paySub" class="pay-btn sub">$5/mo — AI updates</button>
  </div>
  <p class="pay-copy" style="font-size:0.75rem;margin-top:0.35rem;color:#71717a;">Unlock your Phantom (or wallet) first, then click Pay.</p>
  <p class="pay-copy">Lifetime access with one-time. Subscription includes premium + new prompt packs each month. Cancel anytime.</p>
  <p style="margin-top:1rem;"><img src="/image1.jpg" alt="AI keyword research" style="max-width:100%;height:auto;border-radius:8px;max-height:200px;object-fit:cover;" width="600" height="200" onerror="this.style.display='none'"></p>
  <p style="margin-top:1.5rem;font-size:0.8rem;color:#71717a;"><a href="/privacy" style="color:#9945ff;">Privacy &amp; security</a> — We do not store card details. Payments are processed by Stripe or on-chain (Solana). Access is stored only in a cookie on your device.</p>
  <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"><\/script>
  <script>
    (function() {
      var origin = ${JSON.stringify(origin)};
      function disableAll() {
        document.getElementById('paySolana').disabled = true;
        document.getElementById('payStripe').disabled = true;
        document.getElementById('paySub').disabled = true;
      }
      function enableAll() {
        document.getElementById('paySolana').disabled = false;
        document.getElementById('payStripe').disabled = false;
        document.getElementById('paySub').disabled = false;
      }
      document.getElementById('paySolana').addEventListener('click', async function() {
        if (!window.solana) { alert('Install Phantom wallet'); return; }
        var btn = document.getElementById('paySolana');
        disableAll();
        btn.textContent = 'Connecting...';
        try {
          var provider = window.solana;
          await provider.connect();
          var connection = new solanaWeb3.Connection(${JSON.stringify(solanaRpcUrl)});
          var blockhash = (await connection.getLatestBlockhash()).blockhash;
          var tx = new solanaWeb3.Transaction({
            recentBlockhash: blockhash,
            feePayer: provider.publicKey
          }).add(solanaWeb3.SystemProgram.transfer({
            fromPubkey: provider.publicKey,
            toPubkey: new solanaWeb3.PublicKey('${RECIPIENT_PUBKEY}'),
            lamports: 0.01 * solanaWeb3.LAMPORTS_PER_SOL
          }));
          var sig = await provider.signAndSendTransaction(tx);
          var signature = (typeof sig === 'string' ? sig : (sig && typeof sig.signature === 'string' ? sig.signature : (sig && sig.signature != null ? String(sig.signature) : ''))) || '';
          if (!signature) { alert('Could not get transaction signature'); enableAll(); btn.textContent = '~$1.50 (Solana)'; return; }
          var cookieOpts = 'path=/; max-age=31536000; samesite=lax' + (origin.startsWith('https') ? '; secure' : '');
          document.cookie = 'auth_token=' + encodeURIComponent(signature) + '; ' + cookieOpts;
          window.location.reload();
        } catch (e) {
          alert('Please unlock your wallet and try again, or approve the request in your wallet.');
          enableAll();
          btn.textContent = '~$1.50 (Solana)';
        }
      });
      document.getElementById('payStripe').addEventListener('click', async function() {
        var btn = document.getElementById('payStripe');
        disableAll();
        btn.textContent = 'Redirecting...';
        try {
          var res = await fetch(origin + '/api/create-checkout', { method: 'POST' });
          var data = await res.json();
          if (data.url) window.location.href = data.url;
          else { alert(data.error || 'Could not start checkout'); enableAll(); btn.textContent = '$2 one-time (card or Apple Pay)'; }
        } catch (e) {
          alert('Error: ' + (e && e.message) || e);
          enableAll();
          btn.textContent = '$2 one-time (card or Apple Pay)';
        }
      });
      document.getElementById('paySub').addEventListener('click', async function() {
        var btn = document.getElementById('paySub');
        disableAll();
        btn.textContent = 'Redirecting...';
        try {
          var res = await fetch(origin + '/api/create-subscription', { method: 'POST' });
          var data = await res.json();
          if (data.url) window.location.href = data.url;
          else { alert(data.error || 'Could not start subscription'); enableAll(); btn.textContent = '$5/mo — AI updates'; }
        } catch (e) {
          alert('Error: ' + (e && e.message) || e);
          enableAll();
          btn.textContent = '$5/mo — AI updates';
        }
      });
    })();
  <\/script>
</body>
</html>`;
}

/** Verify a Solana tx signature via RPC. */
async function verifySolanaTx(signature: string, solanaRpcUrl: string): Promise<boolean> {
	const trimmed = (signature || '').trim();
	if (!trimmed || trimmed.length < 32) return false;

	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const res = await fetch(solanaRpcUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					method: 'getSignatureStatuses',
					params: [[trimmed]],
				}),
			});
			const data = (await res.json()) as {
				result?: { value?: Array<{ err: unknown; confirmationStatus?: string } | null> };
				error?: unknown;
			};
			if (data?.error) break;
			const status = data?.result?.value?.[0];
			if (status && status.err == null && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) {
				return true;
			}
			if (status?.err != null) return false;
		} catch {
			// retry
		}
		if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
	}

	try {
		const res = await fetch(solanaRpcUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'getTransaction',
				params: [trimmed, { encoding: 'json', maxSupportedTransactionVersion: 0 }],
			}),
		});
		const data = (await res.json()) as { result?: { meta?: { err?: unknown } }; error?: unknown };
		if (data?.error) return false;
		const tx = data?.result;
		if (tx && (tx.meta?.err == null || tx.meta?.err === null)) return true;
	} catch {
		// continue
	}

	const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
	return BASE58.test(trimmed);
}
