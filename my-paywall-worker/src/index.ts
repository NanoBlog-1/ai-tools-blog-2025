const SOLANA_RPC = 'https://api.devnet.solana.com';
const RECIPIENT_PUBKEY = 'Bw2M5DqDsHsNZhGbmyj8WQ9iX55Gk8RPrmxpQj35aUxM';
const STRIPE_PRICE_CENTS = 200; // $2 one-time
const STRIPE_SUBSCRIPTION_CENTS = 500; // $5/month AI updates
const STRIPE_API = 'https://api.stripe.com/v1';

interface Env {
	ASSETS: { fetch: typeof fetch };
	STRIPE_SECRET_KEY?: string;
	PROMPT_PACKS?: KVNamespace;
}

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Fix common typo: /premuim → /premium/
		if (url.pathname === '/premuim' || url.pathname === '/premuim/') {
			return Response.redirect(url.origin + '/premium/', 302);
		}

		// Clean URL: /privacy → privacy.html
		if (url.pathname === '/privacy' || url.pathname === '/privacy/') {
			const privacyRequest = new Request(url.origin + '/privacy.html', { headers: request.headers });
			const privacyResponse = await env.ASSETS.fetch(privacyRequest);
			if (privacyResponse.ok) return privacyResponse;
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
			const cookie = request.headers.get('Cookie') || '';
			const authTokenMatch = cookie.match(/auth_token=([^;]*)/);
			const authToken = authTokenMatch ? decodeURIComponent(authTokenMatch[1].trim()) : null;
			const stripeMatch = cookie.match(/stripe_paid=([^;]*)/);
			const stripeSessionId = stripeMatch ? decodeURIComponent(stripeMatch[1].trim()) : null;

			let hasAccess = false;
			if (authToken) {
				const isValid = await verifySolanaTx(authToken);
				if (isValid) hasAccess = true;
			}
			if (!hasAccess && stripeSessionId && env.STRIPE_SECRET_KEY) {
				const isValid = await verifyStripeSession(stripeSessionId, env.STRIPE_SECRET_KEY);
				if (isValid) hasAccess = true;
			}
			if (!authToken && !stripeSessionId) {
				return new Response(generatePaywallHTML(url.origin), {
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

function generatePaywallHTML(origin: string): string {
	return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Premium AI Tools Access</title>
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
          var connection = new solanaWeb3.Connection('https://api.devnet.solana.com');
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
          var signature = (typeof sig.signature === 'string' ? sig.signature : sig) || '';
          document.cookie = 'auth_token=' + encodeURIComponent(signature) + '; path=/; max-age=31536000; samesite=lax';
          window.location.reload();
        } catch (e) {
          alert('Error: ' + (e && e.message) || e);
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
async function verifySolanaTx(signature: string): Promise<boolean> {
	const trimmed = (signature || '').trim();
	if (!trimmed || trimmed.length < 32) return false;

	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const res = await fetch(SOLANA_RPC, {
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
		const res = await fetch(SOLANA_RPC, {
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
