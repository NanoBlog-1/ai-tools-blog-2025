import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

const BASE = 'http://example.com';

describe('Paywall worker', () => {
	describe('Redirects', () => {
		it('redirects /premuim to /premium/', async () => {
			const request = new Request(`${BASE}/premuim`);
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(302);
			expect(response.headers.get('Location')).toBe(`${BASE}/premium/`);
		});

		it('redirects /premium/?clear=1 and clears cookies', async () => {
			const request = new Request(`${BASE}/premium/?clear=1`);
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(302);
			expect(response.headers.get('Location')).toBe(`${BASE}/premium/`);
			const setCookie = response.headers.getSetCookie?.() ?? [];
			expect(setCookie.some((c) => c.includes('auth_token=') && c.includes('max-age=0'))).toBe(true);
			expect(setCookie.some((c) => c.includes('stripe_paid=') && c.includes('max-age=0'))).toBe(true);
		});
	});

	describe('Paywall and access', () => {
		it('returns 402 paywall HTML for /premium/ with no cookie', async () => {
			const request = new Request(`${BASE}/premium/`);
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(402);
			expect(response.headers.get('Content-Type')).toContain('text/html');
			const html = await response.text();
			expect(html).toMatch(/Unlock|Solana|Stripe|~\$1\.50/);
		});

		it('returns 403 for /premium/ with invalid auth cookie', async () => {
			const request = new Request(`${BASE}/premium/`, {
				headers: { Cookie: 'auth_token=not-a-valid-signature' },
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(403);
			expect(await response.text()).toBe('Invalid or expired access');
		});
	});

	describe('API routes', () => {
		it('GET /api/debug-stripe returns JSON with stripeConfigured and keyLength', async () => {
			const request = new Request(`${BASE}/api/debug-stripe`);
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toContain('application/json');
			const data = (await response.json()) as { stripeConfigured: boolean; keyLength: number };
			expect(typeof data.stripeConfigured).toBe('boolean');
			expect(typeof data.keyLength).toBe('number');
		});

		it('POST /api/create-checkout returns JSON (500 when Stripe not configured, 200 with url when configured)', async () => {
			const request = new Request(`${BASE}/api/create-checkout`, { method: 'POST' });
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			const data = (await response.json()) as { error?: string; url?: string };
			if (response.status === 500) {
				expect(data.error).toBeDefined();
			} else {
				expect(response.status).toBe(200);
				expect(data.url).toBeDefined();
			}
		});

		it('POST /api/create-subscription returns JSON (500 when Stripe not configured, 200 with url when configured)', async () => {
			const request = new Request(`${BASE}/api/create-subscription`, { method: 'POST' });
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			const data = (await response.json()) as { error?: string; url?: string };
			if (response.status === 500) {
				expect(data.error).toBeDefined();
			} else {
				expect(response.status).toBe(200);
				expect(data.url).toBeDefined();
			}
		});
	});

	describe('Integration (SELF)', () => {
		it('returns 402 for /premium/ with no cookie', async () => {
			const response = await SELF.fetch(`${BASE}/premium/`);
			expect(response.status).toBe(402);
			const html = await response.text();
			expect(html).toMatch(/Unlock|Solana|Stripe/);
		});

		it('GET /api/debug-stripe returns JSON', async () => {
			const response = await SELF.fetch(`${BASE}/api/debug-stripe`);
			expect(response.status).toBe(200);
			const data = (await response.json()) as { stripeConfigured: boolean; keyLength: number };
			expect(typeof data.stripeConfigured).toBe('boolean');
			expect(typeof data.keyLength).toBe('number');
		});
	});
});
