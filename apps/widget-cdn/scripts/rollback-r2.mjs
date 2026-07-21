#!/usr/bin/env node
// Point a rolling channel at a previously-published build. The target's
// signed manifest must identify both the requested build and channel before
// the mutable channels.json pointer is changed.

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
    makeClient,
    readJsonObject,
    readChannels,
    writeChannels,
} from './r2-lib.mjs';
import { isValidBuildId } from './build-id.mjs';

export async function rollbackChannel(options) {
    const {
        channel,
        buildId,
        logger = console,
        readManifest = readJsonObject,
        readChannelMap = readChannels,
        writeChannelMap = writeChannels,
    } = options;

    if (!channel || !/^v\d+$/.test(channel) || !isValidBuildId(buildId)) {
        throw new Error('[rollback-r2] invalid channel or buildId');
    }

    const ctx = options.ctx ?? makeClient();
    const manifestKey = `${buildId}/manifest.json`;
    const manifest = await readManifest(ctx, manifestKey);
    if (!manifest) {
        throw new Error(
            `[rollback-r2] build ${buildId} is not published (no ${manifestKey} in bucket).`,
        );
    }
    if (manifest.buildId !== buildId || manifest.channel !== channel) {
        throw new Error(
            `[rollback-r2] ${buildId} identifies build ${manifest.buildId ?? '(unknown)'} `
            + `on ${manifest.channel ?? '(unknown)'}, not ${channel}.`,
        );
    }

    // Verifying loaders fail closed on manifests past `expiresAt` (replay
    // protection), so pointing the channel at an expired build would brick
    // every new mount. Re-publish (re-sign) the target build instead.
    if (typeof manifest.expiresAt === 'string') {
        const expiresMs = Date.parse(manifest.expiresAt);
        const dayMs = 24 * 60 * 60 * 1000;
        if (!Number.isNaN(expiresMs) && expiresMs <= Date.now()) {
            throw new Error(
                `[rollback-r2] build ${buildId} expired at ${manifest.expiresAt} — loaders will refuse it. `
                + 'Re-publish that build (re-signing refreshes its validity window) and retry.',
            );
        }
        if (!Number.isNaN(expiresMs) && expiresMs - Date.now() < 3 * dayMs) {
            logger.warn(
                `[rollback-r2] warning: build ${buildId} expires ${manifest.expiresAt} (<3 days). `
                + 'Plan a re-publish before then or new mounts will start failing.',
            );
        }
    } else {
        logger.warn(
            `[rollback-r2] warning: build ${buildId} has no expiresAt — verifying loaders reject `
            + 'manifests without a validity window. Re-publish it with a current pipeline.',
        );
    }

    const channels = await readChannelMap(ctx);
    const previous = channels[channel];
    if (previous === buildId) {
        logger.log(`[rollback-r2] channel ${channel} already points at ${buildId} — nothing to do.`);
        return { changed: false, previous };
    }
    channels[channel] = buildId;
    await writeChannelMap(ctx, channels);
    logger.log(`[rollback-r2] channel ${channel}: ${previous ?? '(none)'} → ${buildId}`);
    logger.log('[rollback-r2] propagates within ~60s (channel redirect cache).');
    return { changed: true, previous };
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entryUrl === import.meta.url) {
    const [, , channel, buildId] = process.argv;
    if (!channel || !/^v\d+$/.test(channel) || !isValidBuildId(buildId)) {
        console.error('usage: node scripts/rollback-r2.mjs <channel> <buildId>');
        console.error('       e.g. node scripts/rollback-r2.mjs v1 1.4.0-abc123def456');
        process.exitCode = 1;
    } else {
        try {
            await rollbackChannel({ channel, buildId });
        } catch (err) {
            console.error(err instanceof Error ? err.message : err);
            process.exitCode = 1;
        }
    }
}
