#!/usr/bin/env node
// Emit `dist/<channel>/manifest.json` after `rspack build`.
//
// The manifest contains:
//   - version + remoteEntry URL
//   - per-file SHA-384 hashes (SRI format) for every JS in dist/<channel>
//   - killSwitch flag
//   - detached ECDSA P-256 signature over the canonical body
//
// If `LAYERSWAP_PRIVATE_KEY_PEM` is set (path to a PEM file or PEM text),
// the manifest is signed and the resulting signature lives in the
// `signature` field. Otherwise the manifest is emitted unsigned — useful
// for local builds. The loader rejects unsigned manifests only when
// called with `verify: true`.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSign, createPrivateKey, createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const CHANNEL = process.env.LAYERSWAP_CHANNEL || 'v1';
const DIST = join(ROOT, 'dist', CHANNEL);

if (!existsSync(DIST)) {
    console.error(`[build-manifest] expected ${DIST} to exist — run \`pnpm build\` first.`);
    process.exit(1);
}

const pkgJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const version = pkgJson.version || '0.0.0';

// remoteEntry.js sits at the channel root by Rspack config.
const remoteEntry = './remoteEntry.js';

// Hash every JS file in the channel directory and record under the
// filename. The browser will use these via SRI when MF loads the scripts.
function sriOf(filePath) {
    const bytes = readFileSync(filePath);
    const digest = createHash('sha384').update(bytes).digest('base64');
    return `sha384-${digest}`;
}

function collectChunks(dir) {
    const out = {};
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.js')) {
            out[entry.name] = sriOf(join(dir, entry.name));
        }
    }
    return out;
}

// Deterministic JSON: sorts object keys recursively at every level. Must
// match the verifier's `canonicalize` byte-for-byte — its reference
// implementation lives in the shared loader core
// (packages/widget-js/src/manifest.ts), which every loader consumes.
// Do NOT use `JSON.stringify(body, Object.keys(body).sort())`: the array form
// is a property allowlist applied to EVERY nested object, which would drop
// every entry of the `chunks` map (its keys are filenames, not field names),
// leaving the chunk hashes out of the signed bytes.
function canonicalJSON(value) {
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJSON).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.keys(value)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${canonicalJSON(value[k])}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}

const chunks = collectChunks(DIST);

const manifest = {
    version,
    remoteEntry,
    chunks,
    killSwitch: false,
    signature: null,
};

const keyMaterial = process.env.LAYERSWAP_PRIVATE_KEY_PEM;
if (keyMaterial) {
    const pem = existsSync(keyMaterial) ? readFileSync(keyMaterial, 'utf8') : keyMaterial;
    let privateKey;
    try {
        privateKey = createPrivateKey({ key: pem, format: 'pem' });
    } catch (err) {
        console.error('[build-manifest] failed to parse private key:', err.message);
        process.exit(1);
    }

    const body = { ...manifest, signature: null };
    const canonical = canonicalJSON(body);
    // ECDSA P-256 over SHA-256, raw IEEE-P1363 signature (matches WebCrypto verify).
    const signer = createSign('SHA256');
    signer.update(canonical);
    signer.end();
    const sig = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
    manifest.signature = Buffer.from(sig).toString('base64');
    console.log('[build-manifest] manifest signed.');
} else {
    console.log('[build-manifest] LAYERSWAP_PRIVATE_KEY_PEM unset — emitting unsigned manifest.');
}

const out = join(DIST, 'manifest.json');
writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`[build-manifest] wrote ${out}`);
console.log(`[build-manifest] channel: ${CHANNEL}  version: ${version}  chunks: ${Object.keys(chunks).length}  signature: ${manifest.signature ? 'yes' : 'no'}`);
