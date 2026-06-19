#!/usr/bin/env node
// Round-trip the signed manifest in CI before we ship. Reads
// `dist/<channel>/manifest.json` and verifies the signature against the
// public key constant currently exported from `@layerswap/widget-react`.
// Exits non-zero if anything is wrong — catches:
//   - Unsigned manifests when verification is supposed to be on
//   - Drift between the build-time canonicalization and the loader's
//   - Wrong-key situations (key in CI doesn't match the bundled public key)
//
// Same canonical encoding as packages/widget-react/src/manifest.ts.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createVerify, createPublicKey } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(ROOT, '..', '..');

const CHANNEL = process.env.LAYERSWAP_CHANNEL || 'v1';
const MANIFEST_PATH = join(ROOT, 'dist', CHANNEL, 'manifest.json');

if (!existsSync(MANIFEST_PATH)) {
    console.error(`[verify-manifest] missing ${MANIFEST_PATH} — run \`pnpm build\` first.`);
    process.exit(2);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

if (!manifest.signature) {
    console.error('[verify-manifest] manifest has no signature.');
    process.exit(3);
}

// Pull the bundled public key from the widget-react source so we verify
// against the same constant the loader will. If the key has been rotated
// in source but the signer is still using the old one, this catches it.
const MANIFEST_SRC = join(REPO_ROOT, 'packages', 'widget-react', 'src', 'manifest.ts');
const src = readFileSync(MANIFEST_SRC, 'utf8');
const m = src.match(/PLACEHOLDER_PUBLIC_KEY_SPKI_B64\s*=\s*['"]([A-Za-z0-9+/=]+)['"]/);
if (!m) {
    console.error('[verify-manifest] could not extract PLACEHOLDER_PUBLIC_KEY_SPKI_B64 from widget-react source.');
    process.exit(4);
}
const pubB64 = m[1];
const pubDer = Buffer.from(pubB64, 'base64');
const publicKey = createPublicKey({ key: pubDer, format: 'der', type: 'spki' });

const body = { ...manifest, signature: null };
const canonical = JSON.stringify(body, Object.keys(body).sort());

const verifier = createVerify('SHA256');
verifier.update(canonical);
verifier.end();

const ok = verifier.verify(
    { key: publicKey, dsaEncoding: 'ieee-p1363' },
    Buffer.from(manifest.signature, 'base64'),
);

if (!ok) {
    console.error('[verify-manifest] SIGNATURE INVALID — the private key in CI does not match the public key in widget-react.');
    console.error('  manifest:', MANIFEST_PATH);
    console.error('  widget-react public key:', pubB64);
    process.exit(5);
}

console.log(`[verify-manifest] OK  channel=${CHANNEL}  version=${manifest.version}`);
