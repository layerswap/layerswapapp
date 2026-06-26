#!/usr/bin/env node
// Point a rolling channel at a previously-published version — instant
// roll-forward or rollback with no rebuild. Just flips `channels.json`; the
// target version's immutable artifacts are already in R2.
//
//   node scripts/rollback-r2.mjs v1 1.4.0
//
// The change propagates within the channel redirect's 60s cache window.

import { makeClient, objectExists, readChannels, writeChannels } from './r2-lib.mjs';

const [, , channel, version] = process.argv;

if (!channel || !version || !/^v\d+$/.test(channel)) {
    console.error('usage: node scripts/rollback-r2.mjs <channel> <version>');
    console.error('       e.g. node scripts/rollback-r2.mjs v1 1.4.0');
    process.exit(1);
}

const ctx = makeClient();

// Refuse to point a channel at a version that was never published — otherwise
// the channel 302s to a 404 and the widget stops loading.
if (!(await objectExists(ctx, `${version}/manifest.json`))) {
    console.error(`[rollback-r2] version ${version} is not published (no ${version}/manifest.json in bucket).`);
    process.exit(1);
}

const channels = await readChannels(ctx);
const previous = channels[channel];
if (previous === version) {
    console.log(`[rollback-r2] channel ${channel} already points at ${version} — nothing to do.`);
    process.exit(0);
}
channels[channel] = version;
await writeChannels(ctx, channels);
console.log(`[rollback-r2] channel ${channel}: ${previous ?? '(none)'} → ${version}`);
console.log('[rollback-r2] propagates within ~60s (channel redirect cache).');
