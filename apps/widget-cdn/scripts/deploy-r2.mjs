#!/usr/bin/env node
// Upload signed build control files from `dist/<buildId>/` to the immutable
// `<buildId>/` prefix and content-hashed chunks to the shared `/assets/`
// namespace. Unless LAYERSWAP_PROMOTE=false, the rolling channel is then
// updated in `channels.json`.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
    makeClient,
    objectExists,
    putObject,
    readChannels,
    writeChannels,
    contentTypeFor,
} from './r2-lib.mjs';
import { resolveBuildIdentity } from './build-id.mjs';
import {
    ASSET_BASE,
    ASSET_DIRECTORY,
    deploymentKey,
    isSharedAsset,
} from './cdn-layout.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

export function validateManifestIdentity(manifest, identity) {
    const mismatches = [
        ['buildId', manifest.buildId, identity.buildId],
        ['version', manifest.version, identity.version],
        ['channel', manifest.channel, identity.channel],
        ['gitSha', manifest.gitSha, identity.gitSha],
        ['assetBase', manifest.assetBase, ASSET_BASE],
    ].filter(([, actual, expected]) => actual !== expected);

    if (mismatches.length > 0) {
        const details = mismatches
            .map(
                ([field, actual, expected]) => (
                    `${field}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`
                ),
            )
            .join(', ');
        throw new Error(`[deploy-r2] manifest identity does not match this build: ${details}`);
    }
}

function listFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listFiles(full));
        else if (entry.isFile()) out.push(full);
    }
    return out;
}

async function runWithConcurrency(items, limit, task) {
    if (items.length === 0) return;
    const workerCount = Math.min(Math.max(1, Math.floor(limit)), items.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: workerCount }, async () => {
        while (cursor < items.length) {
            const item = items[cursor];
            cursor += 1;
            await task(item);
        }
    }));
}

export async function deployBuild(options = {}) {
    const root = options.root ?? ROOT;
    const identity = options.identity ?? resolveBuildIdentity(root);
    const env = options.env ?? process.env;
    const logger = options.logger ?? console;
    const createClient = options.createClient ?? makeClient;
    const exists = options.objectExists ?? objectExists;
    const upload = options.putObject ?? putObject;
    const readChannelMap = options.readChannels ?? readChannels;
    const writeChannelMap = options.writeChannels ?? writeChannels;
    const uploadConcurrency = options.uploadConcurrency ?? 8;
    const dist = join(root, 'dist', identity.buildId);
    const assetDist = join(root, 'dist', ASSET_DIRECTORY);
    const manifestPath = join(dist, 'manifest.json');

    if (!existsSync(manifestPath)) {
        throw new Error(`[deploy-r2] missing ${manifestPath} — run \`pnpm build\` first.`);
    }

    let manifest;
    try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (err) {
        throw new Error(
            `[deploy-r2] failed to read manifest: ${err instanceof Error ? err.message : String(err)}`,
        );
    }
    if (!manifest.signature) {
        throw new Error(
            '[deploy-r2] refusing to deploy an UNSIGNED manifest. '
            + 'Build with LAYERSWAP_PRIVATE_KEY_PEM set.',
        );
    }

    // This must run before credentials are read or an R2 client is created:
    // stale/copied artifacts must never upload under the wrong immutable key.
    validateManifestIdentity(manifest, identity);
    if (!existsSync(assetDist)) {
        throw new Error(`[deploy-r2] missing shared asset output ${assetDist} — run \`pnpm build\` first.`);
    }

    const ctx = createClient();
    if (await exists(ctx, `${identity.buildId}/manifest.json`)) {
        if (env.ALLOW_OVERWRITE !== '1') {
            throw new Error(
                `[deploy-r2] build ${identity.buildId} is already published (immutable). `
                + 'Deploy from a new commit, or set ALLOW_OVERWRITE=1 to force.',
            );
        }
    }

    // Prepare and validate every key before uploading anything. The manifest
    // is held aside and published only after every payload worker succeeds, so
    // an interrupted upload can never make an incomplete build rollback-ready.
    const files = [
        ...listFiles(dist).map((file) => ({ file, root: dist, shared: false })),
        ...(existsSync(assetDist)
            ? listFiles(assetDist).map((file) => ({ file, root: assetDist, shared: true }))
            : []),
    ].sort((a, b) => a.file.localeCompare(b.file));

    const publishableFiles = files.map(({ file, root: fileRoot, shared }) => {
        const rel = relative(fileRoot, file).split(/[\\/]/).join('/');
        if (shared && !isSharedAsset(rel)) {
            throw new Error(`[deploy-r2] refusing non-content-hashed file in ${ASSET_DIRECTORY}/: ${rel}`);
        }
        return {
            file,
            rel,
            shared,
            key: shared ? deploymentKey(identity.buildId, rel) : `${identity.buildId}/${rel}`,
        };
    });
    const manifestFile = publishableFiles.find(({ file }) => file === manifestPath);
    const payloadFiles = publishableFiles.filter(({ file }) => file !== manifestPath);
    if (!manifestFile) {
        throw new Error(`[deploy-r2] missing ${manifestPath} from publishable files.`);
    }

    let uploaded = 0;
    let reused = 0;
    logger.log(`[deploy-r2] publishing ${files.length} file(s) to ${ctx.bucket} …`);

    const publishFile = async ({ file, rel, shared, key }) => {
        // A content hash is the immutable asset key. Reuse an existing object
        // instead of storing or transferring the same chunk for every build.
        if (shared && env.ALLOW_OVERWRITE !== '1' && await exists(ctx, key)) {
            reused += 1;
            logger.log(`  = ${key} (already published)`);
            return;
        }

        const body = readFileSync(file);
        await upload(ctx, key, body, {
            contentType: contentTypeFor(rel),
            cacheControl: 'public, max-age=31536000, immutable',
        });
        uploaded += 1;
        logger.log(`  ↑ ${key} (${body.length} bytes)`);
    };

    await runWithConcurrency(payloadFiles, uploadConcurrency, publishFile);
    await publishFile(manifestFile);

    logger.log(
        `[deploy-r2] published build ${identity.buildId} (${uploaded} uploaded, ${reused} reused).`,
    );

    if (env.LAYERSWAP_PROMOTE === 'false') {
        logger.log(
            `[deploy-r2] LAYERSWAP_PROMOTE=false — channel ${identity.channel} NOT changed. `
            + 'Promote later with:',
        );
        logger.log(`            node scripts/rollback-r2.mjs ${identity.channel} ${identity.buildId}`);
        return { uploaded, reused, promoted: false };
    }

    const channels = await readChannelMap(ctx);
    const previous = channels[identity.channel];
    channels[identity.channel] = identity.buildId;
    await writeChannelMap(ctx, channels);
    logger.log(
        `[deploy-r2] channel ${identity.channel}: ${previous ?? '(none)'} → ${identity.buildId}`,
    );
    logger.log(`[deploy-r2] live at /${identity.channel}/manifest.json`);
    return { uploaded, reused, promoted: true };
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entryUrl === import.meta.url) {
    try {
        await deployBuild();
    } catch (err) {
        console.error(err instanceof Error ? err.message : err);
        process.exitCode = 1;
    }
}
