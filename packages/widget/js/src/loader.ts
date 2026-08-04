import { fetchManifest, resolveRemoteEntry, verifyManifest, manifestFreshness, ManifestError, WIDGET_MANIFEST_URL } from './manifest.js';
import { registerChunkHashes } from './sri.js';
import { WIDGET_PROTOCOL_MAJOR, widgetProtocolMajorOf } from '@layerswap/widget-types';

export type ResolvedSource = { remoteEntry: string };

/**
 * Fetch + validate the manifest and install per-chunk SRI, returning the
 * resolved remoteEntry URL. Framework-agnostic — shared by the vanilla
 * `mountWidget` and the React `LayerswapWidget` so the security-critical path
 * (signature check + SRI registration) lives in exactly one place.
 *
 * Takes no arguments: the manifest URL and verification policy are fixed in
 * this package. Hosts cannot repoint the loader or disable verification.
 *
 * Single-flight: concurrent mounts share one fetch + signature verification +
 * SRI registration. A successful resolution is reused for a short window
 * ({@link RESOLVE_REUSE_MS}) rather than forever, so mounts on a long-lived
 * page still re-check the manifest (and its kill switch) reasonably soon.
 * Failures are never cached.
 */
export function resolveSource(): Promise<ResolvedSource> {
  const now = Date.now();
  const cached = pendingResolve;
  if (cached && (cached.settledAt === undefined || now - cached.settledAt < RESOLVE_REUSE_MS)) {
    return cached.promise;
  }
  const entry: PendingResolve = {
    promise: resolveSourceOnce().then(
      (result) => {
        entry.settledAt = Date.now();
        return result;
      },
      (error) => {
        if (pendingResolve === entry) pendingResolve = undefined;
        throw error;
      },
    ),
  };
  pendingResolve = entry;
  return entry.promise;
}

const RESOLVE_REUSE_MS = 60_000;

type PendingResolve = { promise: Promise<ResolvedSource>; settledAt?: number };
let pendingResolve: PendingResolve | undefined;

async function resolveSourceOnce(): Promise<ResolvedSource> {
  // Force a revalidation so we always verify the freshest manifest bytes.
  const { manifest, url: resolvedManifestUrl } = await fetchManifest(WIDGET_MANIFEST_URL);
  if (manifest.killSwitch) {
    throw new ManifestError('kill-switch', 'manifest kill switch is set — refusing to load remote');
  }
  const ok = await verifyManifest(manifest);
  if (!ok) {
    throw new ManifestError('signature', 'manifest signature is missing or invalid');
  }
  // Freshness is only meaningful once the signed body is trusted (an
  // attacker controls unverified fields anyway) — and it is REQUIRED then:
  // a valid-but-stale manifest is exactly the replay this check exists to
  // stop. See `Manifest.expiresAt` for the availability policy.
  const freshness = manifestFreshness(manifest, Date.now());
  if (freshness !== 'fresh') {
    throw new ManifestError(
      'stale',
      freshness === 'expired'
        ? `manifest expired at ${manifest.expiresAt} — refusing a possibly replayed build`
        : 'manifest carries no valid expiresAt — refusing to trust it indefinitely',
    );
  }
  const remoteProtocolMajor = widgetProtocolMajorOf(manifest);
  if (remoteProtocolMajor !== WIDGET_PROTOCOL_MAJOR) {
    throw new ManifestError(
      'incompatible',
      `widget protocol v${String(remoteProtocolMajor)} is incompatible with loader v${WIDGET_PROTOCOL_MAJOR}`,
    );
  }
  // Identify the build in the console — version, commit, and build time from
  // the (now-validated) manifest. Answers "which build is this page actually
  // running?" without leaving the browser, e.g. when a page looks stale after
  // a deploy: a mismatched sha here means the fix never reached the channel.
  const provenance = [manifest.gitSha?.slice(0, 7), manifest.builtAt && `built ${manifest.builtAt}`]
    .filter(Boolean)
    .join(', ');
  console.info(`[layerswap/widget-js] widget ${manifest.version}${provenance ? ` (${provenance})` : ''}`);
  // Resolve against the manifest's FINAL (post-redirect) URL, not the URL the
  // caller passed. A rolling channel URL (`/v1/manifest.json`) 302-redirects to
  // an immutable build (`/1.5.0/manifest.json`); resolving the relative
  // `remoteEntry` against that lands the remote at the immutable build path.
  const remoteEntry = resolveRemoteEntry(resolvedManifestUrl, manifest.remoteEntry);
  // Install per-chunk SRI BEFORE MF runtime starts loading scripts. Once
  // the manifest's signed body is trusted, its `chunks` map pins the bytes
  // of every JS file the browser will fetch from our origin — including
  // remoteEntry.js and every lazy chunk loaded later.
  if (manifest.chunks && Object.keys(manifest.chunks).length > 0) {
    if (manifest.assetBase) {
      const remoteFilename = filenameFromUrl(remoteEntry);
      const remoteHash = remoteFilename && manifest.chunks[remoteFilename];
      // Register the immutable build prefix even when a malformed manifest
      // omitted remoteEntry's hash. The request then fails closed as an
      // unknown script under a protected prefix.
      registerChunkHashes(
        remoteEntry,
        remoteHash && remoteFilename ? { [remoteFilename]: remoteHash } : manifest.chunks,
      );

      const assetHashes = Object.fromEntries(
        Object.entries(manifest.chunks).filter(([filename]) => filename !== remoteFilename),
      );
      if (Object.keys(assetHashes).length > 0) {
        const assetBase = resolveRemoteEntry(resolvedManifestUrl, manifest.assetBase);
        // Every build shares this content-addressed prefix. Merge maps while
        // rejecting the only unsafe case: one filename claiming two hashes.
        registerChunkHashes(assetBase, assetHashes, { merge: true });
      }
    } else {
      registerChunkHashes(remoteEntry, manifest.chunks);
    }
  }
  return { remoteEntry };
}

function filenameFromUrl(value: string): string | undefined {
  try {
    return new URL(value).pathname.split('/').filter(Boolean).pop();
  } catch {
    return value.split('/').filter(Boolean).pop();
  }
}
