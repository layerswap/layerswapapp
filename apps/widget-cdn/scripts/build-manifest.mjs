#!/usr/bin/env node
// Emit `dist/<channel>/manifest.json` after `rspack build`.
//
// If `LAYERSWAP_PRIVATE_KEY_PEM` is set (path to an ECDSA P-256 private key
// PEM file or the PEM text itself), the manifest is signed and the resulting
// detached signature lives in the `signature` field. Otherwise the manifest
// is emitted with `signature: null` — useful for local builds. The loader
// rejects unsigned manifests only when called with `verify: true`.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSign, createPrivateKey } from 'node:crypto';

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

const manifest = {
    version,
    remoteEntry,
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
    const canonical = JSON.stringify(body, Object.keys(body).sort());
    // ECDSA P-256 over SHA-256, raw IEEE-P1363 signature (matches WebCrypto verify).
    const signer = createSign('SHA256');
    signer.update(canonical);
    signer.end();
    const der = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
    manifest.signature = Buffer.from(der).toString('base64');
    console.log('[build-manifest] manifest signed.');
} else {
    console.log('[build-manifest] LAYERSWAP_PRIVATE_KEY_PEM unset — emitting unsigned manifest.');
}

const out = join(DIST, 'manifest.json');
writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`[build-manifest] wrote ${out}`);
console.log(`[build-manifest] channel: ${CHANNEL}  version: ${version}  signature: ${manifest.signature ? 'yes' : 'no'}`);
