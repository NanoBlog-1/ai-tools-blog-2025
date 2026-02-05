#!/usr/bin/env node
/**
 * Upload prompt packs to KV so they update without redeploying the worker.
 * Run from my-paywall-worker: node scripts/sync-packs-to-kv.js
 * Requires: PROMPT_PACKS_NAMESPACE_ID in env, or "id" in wrangler.jsonc kv_namespaces[0] (not REPLACE_AFTER_CREATE).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PACKS_DIR = path.join(ROOT, 'public', 'premium', 'packs');

function getNamespaceId() {
  if (process.env.PROMPT_PACKS_NAMESPACE_ID) {
    return process.env.PROMPT_PACKS_NAMESPACE_ID;
  }
  const wranglerPath = path.join(ROOT, 'wrangler.jsonc');
  if (!fs.existsSync(wranglerPath)) return null;
  const text = fs.readFileSync(wranglerPath, 'utf8');
  const m = text.match(/"kv_namespaces"[\s\S]*?"id"\s*:\s*"([^"]+)"/);
  return m ? m[1] : null;
}

function main() {
  const namespaceId = getNamespaceId();
  if (!namespaceId || namespaceId === 'REPLACE_AFTER_CREATE') {
    console.error('Missing KV namespace id.');
    console.error('1. Create: npx wrangler kv namespace create PROMPT_PACKS');
    console.error('2. Put the id in wrangler.jsonc under kv_namespaces[0].id');
    console.error('   OR set env: export PROMPT_PACKS_NAMESPACE_ID=<id>');
    console.error('3. Run this script again: node scripts/sync-packs-to-kv.js');
    process.exit(1);
  }

  const indexPath = path.join(PACKS_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('Not found:', indexPath);
    process.exit(1);
  }

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const slugs = (index.packs || []).map((p) => p.slug).filter(Boolean);

  function put(key, filePath) {
    if (!fs.existsSync(filePath)) {
      console.warn('Skip (file missing):', filePath);
      return;
    }
    const absolutePath = path.resolve(ROOT, filePath);
    execSync(
      `npx wrangler kv key put "${key}" --path "${absolutePath}" --namespace-id "${namespaceId}"`,
      { cwd: ROOT, stdio: 'inherit' }
    );
  }

  put('packs:index', path.relative(ROOT, indexPath));
  for (const slug of slugs) {
    put(`packs:${slug}`, path.relative(ROOT, path.join(PACKS_DIR, `${slug}.md`)));
  }

  console.log('Done. Packs are in KV; no deploy needed. Subscribers will see updates within ~60s.');
}

main();
