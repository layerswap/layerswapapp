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

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createVerify, createPublicKey, createHash } from 'node:crypto';

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
const m = src.match(/MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64\s*=\s*['"]([A-Za-z0-9+/=]+)['"]/);
if (!m) {
    console.error('[verify-manifest] could not extract MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64 from widget-react source.');
    process.exit(4);
}
const pubB64 = m[1];
const pubDer = Buffer.from(pubB64, 'base64');
const publicKey = createPublicKey({ key: pubDer, format: 'der', type: 'spki' });

// Deterministic JSON: sorts object keys recursively at every level. Must
// match `canonicalize` in packages/widget-react/src/manifest.ts and the
// signer in build-manifest.mjs byte-for-byte. The array form of
// JSON.stringify is an allowlist applied to every nested object and would
// drop the entire `chunks` map from the signed bytes.
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

const body = { ...manifest, signature: null };
const canonical = canonicalJSON(body);

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

// Round-trip the chunks map against the actual files on disk. Catches
// the case where the manifest was signed with stale hashes (e.g. the
// hashing step accidentally ran before the build refreshed the chunks).
const chunks = manifest.chunks ?? {};
if (Object.keys(chunks).length === 0) {
    console.error('[verify-manifest] manifest has no `chunks` map — CDN-tamper protection is missing.');
    process.exit(6);
}

const DIST = dirname(MANIFEST_PATH);
const actualFiles = readdirSync(DIST).filter((n) => n.endsWith('.js'));

const expected = new Set(Object.keys(chunks));
const actual = new Set(actualFiles);

// Every chunk on disk must be in the manifest, and vice versa.
const missingInManifest = actualFiles.filter((n) => !expected.has(n));
const missingOnDisk = [...expected].filter((n) => !actual.has(n));

if (missingInManifest.length > 0) {
    console.error('[verify-manifest] files on disk missing from manifest:', missingInManifest);
    process.exit(7);
}
if (missingOnDisk.length > 0) {
    console.error('[verify-manifest] files referenced in manifest are missing from disk:', missingOnDisk);
    process.exit(7);
}

// Each listed hash must match the actual file content.
const mismatches = [];
for (const filename of actualFiles) {
    const bytes = readFileSync(join(DIST, filename));
    const digest = createHash('sha384').update(bytes).digest('base64');
    const expectedHash = chunks[filename];
    const actualHash = `sha384-${digest}`;
    if (expectedHash !== actualHash) {
        mismatches.push({ filename, expected: expectedHash, actual: actualHash });
    }
}

if (mismatches.length > 0) {
    console.error('[verify-manifest] chunk hashes do not match disk content:');
    for (const m of mismatches) console.error(`  ${m.filename}\n    expected: ${m.expected}\n    actual:   ${m.actual}`);
    process.exit(8);
}

console.log(`[verify-manifest] OK  channel=${CHANNEL}  version=${manifest.version}  chunks=${actualFiles.length}`);
