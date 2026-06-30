#!/usr/bin/env node
// Upload the signed build in `dist/<version>/` to R2 under the immutable
// `<version>/` prefix, then (unless LAYERSWAP_PROMOTE=false) flip the rolling
// channel pointer in `channels.json` to this version.
//
// Immutability is enforced: if `<version>/manifest.json` already exists in the
// bucket, the upload is refused unless ALLOW_OVERWRITE=1. Published versions
// are forever — bump the version to ship again.
//
//   pnpm deploy:r2                 # upload + promote channel to this version
//   LAYERSWAP_PROMOTE=false ...    # upload only (staged release; promote later)
//   ALLOW_OVERWRITE=1 ...          # re-upload an existing version (escape hatch)

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    makeClient,
    objectExists,
    putObject,
    readChannels,
    writeChannels,
    contentTypeFor,
} from './r2-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Read from the workspace symlink (exports map hides ./package.json).
const widgetPkg = JSON.parse(
    readFileSync(join(ROOT, 'node_modules', '@layerswap', 'widget', 'package.json'), 'utf8'),
);
const VERSION = process.env.LAYERSWAP_RELEASE_VERSION || widgetPkg.version || '0.0.0';
const DIST = join(ROOT, 'dist', VERSION);
const MANIFEST_PATH = join(DIST, 'manifest.json');

if (!existsSync(MANIFEST_PATH)) {
    console.error(`[deploy-r2] missing ${MANIFEST_PATH} — run \`pnpm build\` first.`);
    process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
if (!manifest.signature) {
    console.error('[deploy-r2] refusing to deploy an UNSIGNED manifest. Build with LAYERSWAP_PRIVATE_KEY_PEM set.');
    process.exit(1);
}
const channel = manifest.channel || `v${VERSION.split('.')[0]}`;

// Recursively list files under DIST (the build output is flat today, but
// recurse so nested assets survive a future config change).
function listFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listFiles(full));
        else if (entry.isFile()) out.push(full);
    }
    return out;
}

const ctx = makeClient();

const exists = await objectExists(ctx, `${VERSION}/manifest.json`);
if (exists && process.env.ALLOW_OVERWRITE !== '1') {
    console.error(
        `[deploy-r2] version ${VERSION} is already published (immutable). ` +
        `Bump @layerswap/widget, or set ALLOW_OVERWRITE=1 to force.`,
    );
    process.exit(1);
}

const files = listFiles(DIST);
console.log(`[deploy-r2] uploading ${files.length} file(s) to ${ctx.bucket}/${VERSION}/ …`);

for (const file of files) {
    const rel = relative(DIST, file).split(/[\\/]/).join('/');
    const key = `${VERSION}/${rel}`;
    const body = readFileSync(file);
    await putObject(ctx, key, body, {
        contentType: contentTypeFor(rel),
        // Immutable artifacts — the version is the cache key. The Worker sets
        // the same header on the response; we set it on the object too so the
        // bucket is correct even if ever served without the Worker.
        cacheControl: 'public, max-age=31536000, immutable',
    });
    console.log(`  ↑ ${key} (${body.length} bytes)`);
}

console.log(`[deploy-r2] uploaded version ${VERSION} (${files.length} files).`);

if (process.env.LAYERSWAP_PROMOTE === 'false') {
    console.log(`[deploy-r2] LAYERSWAP_PROMOTE=false — channel ${channel} NOT changed. Promote later with:`);
    console.log(`            node scripts/rollback-r2.mjs ${channel} ${VERSION}`);
    process.exit(0);
}

const channels = await readChannels(ctx);
const previous = channels[channel];
channels[channel] = VERSION;
await writeChannels(ctx, channels);
console.log(`[deploy-r2] channel ${channel}: ${previous ?? '(none)'} → ${VERSION}`);
console.log(`[deploy-r2] live at /${channel}/manifest.json`);
