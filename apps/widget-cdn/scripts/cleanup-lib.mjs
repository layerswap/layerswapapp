// Reference-aware cleanup for the widget CDN storage in Azure Blob Storage
// (immutable /<buildId>/ prefixes, shared content-hashed /assets/, and the
// mutable rolling /<channel>/manifest.json pointer).
//
// Deletion policy — a build prefix is RETAINED when any of these hold:
//   - it is the current target of any rolling channel pointer;
//   - its signed manifest has not expired (unexpired builds are valid rollback
//     targets, and in-flight browser sessions may still lazy-load their
//     chunks);
//   - it is one of the N most recent builds of its channel (rollback depth
//     even when everything has expired);
//   - it has no readable manifest but was uploaded recently (a deploy in
//     flight publishes the manifest LAST — the grace period keeps cleanup
//     from racing it).
// Everything else is deleted, manifest.json first, so a half-deleted build
// can never be promoted by rollback scripts (they require the manifest).
//
// Shared assets are mark-and-swept: the union of `chunks` referenced by every
// RETAINED manifest is protected; unreferenced assets are deleted only after
// their own grace period (again to avoid racing an in-flight deploy that
// uploads assets before its manifest). NEVER apply an age-only policy to
// /assets/ — chunks are shared between builds.
//
// Anything anomalous (unknown top-level keys, a manifest whose buildId does
// not match its prefix, a channel pointing at a missing build) is kept and
// surfaced as a warning — cleanup only deletes what it fully understands.

import { readFileSync, writeFileSync } from 'node:fs';
import { isValidBuildId } from './build-id.mjs';
import { ASSET_DIRECTORY, isSharedAsset } from './cdn-layout.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
// Must cover the loader's clock-skew allowance (5 min) with margin.
const EXPIRY_SKEW_MS = 60 * 60 * 1000;
const CHANNEL_EXPIRY_WARN_MS = 7 * DAY_MS;
const CHANNEL_RE = /^v\d+$/;

export const DEFAULT_MIN_RECENT_PER_CHANNEL = 3;
export const DEFAULT_ASSET_GRACE_MS = 2 * DAY_MS;
export const DEFAULT_ORPHAN_GRACE_MS = 2 * DAY_MS;

function toMs(value) {
    if (value == null) return undefined;
    const ms = value instanceof Date ? value.getTime() : Date.parse(value);
    return Number.isNaN(ms) ? undefined : ms;
}

/**
 * Split a full object listing into build prefixes, shared assets, rolling
 * channel objects, and everything else. Channel objects and unknown keys are
 * never deletion candidates.
 */
export function partitionObjects(objects) {
    const builds = new Map();
    const assets = [];
    const channelObjects = [];
    const unknown = [];
    for (const object of objects) {
        const segments = object.key.split('/');
        const [first, ...rest] = segments;
        if (CHANNEL_RE.test(first)) {
            channelObjects.push(object);
            continue;
        }
        if (first === ASSET_DIRECTORY) {
            if (rest.length === 1 && isSharedAsset(rest[0])) {
                assets.push({ ...object, name: rest[0] });
            } else {
                unknown.push(object);
            }
            continue;
        }
        if (rest.length > 0 && isValidBuildId(first)) {
            if (!builds.has(first)) builds.set(first, []);
            builds.get(first).push(object);
            continue;
        }
        unknown.push(object);
    }
    return { builds, assets, channelObjects, unknown };
}

/**
 * Pure retention planner. Inputs:
 *   now       epoch ms
 *   channels  { v1: '<buildId>', … } — current rolling pointers
 *   builds    [{ buildId, keys: [{ key, lastModified }], manifest|null }]
 *   assets    [{ key, name, lastModified }]
 */
export function planCleanup({
    now,
    channels,
    builds,
    assets,
    minRecentPerChannel = DEFAULT_MIN_RECENT_PER_CHANNEL,
    assetGraceMs = DEFAULT_ASSET_GRACE_MS,
    orphanGraceMs = DEFAULT_ORPHAN_GRACE_MS,
}) {
    if (!Number.isFinite(now)) throw new Error('[cleanup] planCleanup requires `now`');
    const warnings = [];

    const promotedChannels = new Map();
    for (const [channel, buildId] of Object.entries(channels)) {
        if (!builds.some((b) => b.buildId === buildId)) {
            warnings.push(
                `channel ${channel} points at ${buildId}, which has no published build prefix`,
            );
        }
        const list = promotedChannels.get(buildId) ?? [];
        list.push(channel);
        promotedChannels.set(buildId, list);
    }

    const entries = builds.map((build) => {
        const newestUpload = Math.max(
            0,
            ...build.keys.map((k) => toMs(k.lastModified) ?? 0),
        );
        return {
            ...build,
            expiresMs: toMs(build.manifest?.expiresAt),
            recency: toMs(build.manifest?.issuedAt) ?? newestUpload,
            newestUpload,
            reasons: [],
        };
    });

    // N most recent builds per channel survive even past manifest expiry.
    const byChannel = new Map();
    for (const entry of entries) {
        if (!entry.manifest) continue;
        const channel =
            typeof entry.manifest.channel === 'string' ? entry.manifest.channel : '(unknown)';
        const list = byChannel.get(channel) ?? [];
        list.push(entry);
        byChannel.set(channel, list);
    }
    for (const list of byChannel.values()) {
        list.sort((a, b) => b.recency - a.recency);
        for (const entry of list.slice(0, minRecentPerChannel)) {
            entry.reasons.push('recent');
        }
    }

    for (const entry of entries) {
        const liveChannels = promotedChannels.get(entry.buildId);
        if (liveChannels) {
            entry.reasons.push(...liveChannels.map((c) => `promoted:${c}`));
            if (!entry.manifest) {
                warnings.push(`promoted build ${entry.buildId} has no readable manifest`);
            } else if (entry.expiresMs === undefined) {
                warnings.push(
                    `promoted build ${entry.buildId} has no valid expiresAt — verifying loaders reject it`,
                );
            } else if (entry.expiresMs <= now) {
                warnings.push(
                    `promoted build ${entry.buildId} EXPIRED at ${entry.manifest.expiresAt} — ` +
                        'verifying loaders are failing closed; re-publish now',
                );
            } else if (entry.expiresMs - now < CHANNEL_EXPIRY_WARN_MS) {
                warnings.push(
                    `promoted build ${entry.buildId} expires ${entry.manifest.expiresAt} ` +
                        '(<7 days) — deploy or re-sign before the channel goes dark',
                );
            }
        }

        if (entry.manifest) {
            if (entry.manifest.buildId !== entry.buildId) {
                warnings.push(
                    `build prefix ${entry.buildId} contains a manifest claiming to be ` +
                        `${JSON.stringify(entry.manifest.buildId)} — kept, investigate manually`,
                );
                entry.reasons.push('manifest-mismatch');
            }
            if (entry.expiresMs !== undefined && entry.expiresMs + EXPIRY_SKEW_MS > now) {
                entry.reasons.push('unexpired');
            }
        } else if (now - entry.newestUpload < orphanGraceMs) {
            // Possibly a deploy in flight: its manifest publishes last.
            entry.reasons.push('upload-grace');
        }
    }

    const keepBuilds = entries.filter((e) => e.reasons.length > 0);
    const deleteBuilds = entries
        .filter((e) => e.reasons.length === 0)
        .map((e) => ({
            buildId: e.buildId,
            keys: e.keys.map((k) => k.key),
            reason: e.manifest
                ? 'expired, not promoted, not recent'
                : 'no manifest (incomplete upload) past grace period',
        }));

    // Mark-and-sweep the shared asset namespace against retained manifests.
    const referenced = new Set();
    for (const entry of keepBuilds) {
        for (const name of Object.keys(entry.manifest?.chunks ?? {})) {
            if (isSharedAsset(name)) referenced.add(name);
        }
    }
    const deleteAssets = [];
    let referencedAssets = 0;
    let gracedAssets = 0;
    for (const asset of assets) {
        if (referenced.has(asset.name)) {
            referencedAssets += 1;
            continue;
        }
        const age = now - (toMs(asset.lastModified) ?? now);
        if (age < assetGraceMs) {
            gracedAssets += 1;
            continue;
        }
        deleteAssets.push(asset.key);
    }

    return {
        keepBuilds: keepBuilds.map((e) => ({ buildId: e.buildId, reasons: e.reasons })),
        deleteBuilds,
        deleteAssets,
        referencedAssets,
        gracedAssets,
        warnings,
    };
}

async function runWithConcurrency(items, limit, task) {
    if (items.length === 0) return;
    const workerCount = Math.min(Math.max(1, Math.floor(limit)), items.length);
    let cursor = 0;
    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (cursor < items.length) {
                const item = items[cursor];
                cursor += 1;
                await task(item);
            }
        }),
    );
}

function normalizedPointers(channels) {
    return JSON.stringify(
        Object.fromEntries(Object.entries(channels).sort(([a], [b]) => a.localeCompare(b))),
    );
}

/**
 * Full cleanup pass over one storage backend. Dry-run unless `apply` is true.
 *
 * ops = {
 *   listObjects(ctx)          -> [{ key, lastModified }]
 *   readJson(ctx, key)        -> object | undefined
 *   readChannelPointers(ctx)  -> { [channel]: buildId }
 *   deleteObject(ctx, key)
 * }
 *
 * `approvedPlan` (a previously written plan file) restricts deletion to the
 * items a human approved: the fresh plan is recomputed from live state, and
 * only its intersection with the approved plan is deleted. Items that became
 * deletable after approval are deferred; approved items that are no longer
 * deletable stay protected.
 */
export async function runCleanup({
    ctx,
    ops,
    apply = false,
    approvedPlan,
    now = Date.now(),
    logger = console,
    minRecentPerChannel,
    assetGraceMs,
    orphanGraceMs,
    deleteConcurrency = 8,
}) {
    const objects = await ops.listObjects(ctx);
    const { builds: buildMap, assets, unknown } = partitionObjects(objects);
    const channels = await ops.readChannelPointers(ctx);

    const builds = [];
    for (const [buildId, keys] of buildMap) {
        const manifestKey = `${buildId}/manifest.json`;
        const hasManifest = keys.some((k) => k.key === manifestKey);
        const manifest = hasManifest ? await ops.readJson(ctx, manifestKey) : undefined;
        builds.push({ buildId, keys, manifest: manifest ?? null });
    }

    const plan = planCleanup({
        now,
        channels,
        builds,
        assets,
        ...(minRecentPerChannel !== undefined ? { minRecentPerChannel } : {}),
        ...(assetGraceMs !== undefined ? { assetGraceMs } : {}),
        ...(orphanGraceMs !== undefined ? { orphanGraceMs } : {}),
    });

    if (approvedPlan) {
        const approvedBuildIds = new Set(
            (approvedPlan.deleteBuilds ?? [])
                .map((b) => (typeof b === 'string' ? b : b?.buildId))
                .filter(Boolean),
        );
        const approvedAssetKeys = new Set(approvedPlan.deleteAssets ?? []);
        const freshBuilds = plan.deleteBuilds;
        const freshAssets = plan.deleteAssets;
        plan.deleteBuilds = freshBuilds.filter((b) => approvedBuildIds.has(b.buildId));
        plan.deleteAssets = freshAssets.filter((k) => approvedAssetKeys.has(k));
        const deferredBuilds = freshBuilds.length - plan.deleteBuilds.length;
        const deferredAssets = freshAssets.length - plan.deleteAssets.length;
        const staleBuilds = approvedBuildIds.size - plan.deleteBuilds.length;
        const staleAssets = approvedAssetKeys.size - plan.deleteAssets.length;
        if (deferredBuilds || deferredAssets) {
            logger.log(
                `[cleanup] approval filter: ${deferredBuilds} build(s) and ${deferredAssets} ` +
                    'asset(s) became deletable after the plan was approved — deferred to a future run.',
            );
        }
        if (staleBuilds || staleAssets) {
            logger.warn(
                `[cleanup] WARNING: ${staleBuilds} approved build(s) and ${staleAssets} approved ` +
                    'asset(s) are no longer deletable — they stay protected.',
            );
        }
    }

    logger.log(
        `[cleanup] ${builds.length} build(s), ${assets.length} shared asset(s), ` +
            `channels: ${normalizedPointers(channels)}`,
    );
    for (const key of unknown) {
        logger.warn(`[cleanup] WARNING: unrecognized key left untouched: ${key.key}`);
    }
    for (const warning of plan.warnings) {
        logger.warn(`[cleanup] WARNING: ${warning}`);
    }
    for (const build of plan.keepBuilds) {
        logger.log(`  keep   ${build.buildId} (${build.reasons.join(', ')})`);
    }
    for (const build of plan.deleteBuilds) {
        logger.log(`  delete ${build.buildId} — ${build.reason} (${build.keys.length} object(s))`);
    }
    logger.log(
        `[cleanup] assets: ${plan.referencedAssets} referenced, ` +
            `${plan.gracedAssets} in grace period, ${plan.deleteAssets.length} to delete`,
    );

    if (!apply) {
        logger.log('[cleanup] dry run — nothing deleted. Re-run with --apply to delete.');
        return { ...plan, unknown: unknown.map((k) => k.key), applied: false, deletedObjects: 0 };
    }

    // The pointer set is the ground truth for what must survive. If a promote
    // or rollback landed while we were planning, the plan is stale — abort.
    const pointersNow = await ops.readChannelPointers(ctx);
    if (normalizedPointers(pointersNow) !== normalizedPointers(channels)) {
        throw new Error(
            '[cleanup] channel pointers changed while planning ' +
                `(${normalizedPointers(channels)} → ${normalizedPointers(pointersNow)}) — re-run.`,
        );
    }

    let deletedObjects = 0;
    for (const build of plan.deleteBuilds) {
        const manifestKey = `${build.buildId}/manifest.json`;
        // Manifest first: without it the prefix can no longer be promoted, so
        // an interrupted deletion never leaves a promotable half-build behind.
        const ordered = [
            ...build.keys.filter((k) => k === manifestKey),
            ...build.keys.filter((k) => k !== manifestKey),
        ];
        for (const key of ordered) {
            await ops.deleteObject(ctx, key);
            deletedObjects += 1;
            logger.log(`  ✕ ${key}`);
        }
    }
    await runWithConcurrency(plan.deleteAssets, deleteConcurrency, async (key) => {
        await ops.deleteObject(ctx, key);
        deletedObjects += 1;
        logger.log(`  ✕ ${key}`);
    });

    logger.log(
        `[cleanup] deleted ${plan.deleteBuilds.length} build(s) and ` +
            `${plan.deleteAssets.length} asset(s) (${deletedObjects} object(s) total).`,
    );
    return { ...plan, unknown: unknown.map((k) => k.key), applied: true, deletedObjects };
}

export function parseCleanupArgs(argv) {
    const options = { apply: false };
    const requireNumber = (raw, flag) => {
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) {
            throw new Error(`[cleanup] ${flag} expects a non-negative number, got ${JSON.stringify(raw)}`);
        }
        return value;
    };
    const requirePath = (raw, flag) => {
        if (typeof raw !== 'string' || raw.length === 0) {
            throw new Error(`[cleanup] ${flag} expects a file path`);
        }
        return raw;
    };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--apply') options.apply = true;
        else if (arg === '--keep-recent') {
            options.minRecentPerChannel = requireNumber(argv[(i += 1)], arg);
        } else if (arg === '--asset-grace-days') {
            options.assetGraceMs = requireNumber(argv[(i += 1)], arg) * DAY_MS;
        } else if (arg === '--build-grace-days') {
            options.orphanGraceMs = requireNumber(argv[(i += 1)], arg) * DAY_MS;
        } else if (arg === '--plan-out') {
            options.planOut = requirePath(argv[(i += 1)], arg);
        } else if (arg === '--plan-in') {
            options.planIn = requirePath(argv[(i += 1)], arg);
        } else {
            throw new Error(`[cleanup] unknown argument: ${arg}`);
        }
    }
    return options;
}

/**
 * CLI wrapper for cleanup-azure.mjs. Adds the approval round-trip:
 * `--plan-out <file>` captures the dry-run plan for a human to review, and
 * `--apply --plan-in <file>` deletes only what that reviewed plan approved.
 */
export async function runCleanupCli({ argv, ctx, ops, logger = console, now }) {
    const { planOut, planIn, ...options } = parseCleanupArgs(argv);
    if (planOut && options.apply) {
        throw new Error('[cleanup] --plan-out captures a dry-run plan; drop --apply.');
    }
    if (planIn && !options.apply) {
        throw new Error('[cleanup] --plan-in only applies an approved plan; add --apply.');
    }
    const approvedPlan = planIn ? JSON.parse(readFileSync(planIn, 'utf8')) : undefined;
    const result = await runCleanup({
        ctx,
        ops,
        logger,
        approvedPlan,
        ...(now !== undefined ? { now } : {}),
        ...options,
    });
    if (planOut) {
        writeFileSync(
            planOut,
            JSON.stringify({ generatedAt: new Date(now ?? Date.now()).toISOString(), ...result }, null, 2),
        );
        logger.log(`[cleanup] plan written to ${planOut}`);
    }
    return result;
}
