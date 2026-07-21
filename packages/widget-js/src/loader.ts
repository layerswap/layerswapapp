import { fetchManifest, resolveRemoteEntry, verifyManifest, manifestFreshness, ManifestError, DEFAULT_MANIFEST_URL } from './manifest.js';
import { registerChunkHashes } from './sri.js';

export type ResolvedSource = { remoteEntry: string };

/**
 * Internal-only override, read from `globalThis`. NOT part of the public API:
 * integrators always get the canonical signed CDN baked into this package
 * ({@link DEFAULT_MANIFEST_URL}) and cannot repoint the loader. Layerswap's own
 * dev harnesses (the example host, the playground) set these globals before the
 * widget mounts to target the local unsigned dev server. Undocumented on
 * purpose — treat it as a build/test seam, not a supported knob.
 *
 *   globalThis.__LAYERSWAP_WIDGET_MANIFEST__ = 'http://127.0.0.1:3100/manifest.json';
 *   globalThis.__LAYERSWAP_WIDGET_VERIFY__ = false;
 */
type InternalOverrideGlobals = {
  __LAYERSWAP_WIDGET_MANIFEST__?: unknown;
  __LAYERSWAP_WIDGET_VERIFY__?: unknown;
};

function resolveConfig(): { manifestUrl: string; verify: boolean } {
  const g = globalThis as InternalOverrideGlobals;
  const manifestUrl =
    typeof g.__LAYERSWAP_WIDGET_MANIFEST__ === 'string' && g.__LAYERSWAP_WIDGET_MANIFEST__
      ? g.__LAYERSWAP_WIDGET_MANIFEST__
      : DEFAULT_MANIFEST_URL;
  // Fail closed: verification is on unless a harness explicitly disables it.
  const verify = typeof g.__LAYERSWAP_WIDGET_VERIFY__ === 'boolean' ? g.__LAYERSWAP_WIDGET_VERIFY__ : true;
  return { manifestUrl, verify };
}

/**
 * Fetch + validate the manifest and install per-chunk SRI, returning the
 * resolved remoteEntry URL. Framework-agnostic — shared by the vanilla
 * `mountWidget` and the React `LayerswapWidget` so the security-critical path
 * (signature check + SRI registration) lives in exactly one place.
 *
 * Takes no arguments: the manifest URL is the canonical Layerswap CDN baked
 * into this package. (Layerswap's own dev harnesses can repoint it via the
 * internal `__LAYERSWAP_WIDGET_*` globals — see {@link resolveConfig}.)
 *
 * Single-flight: concurrent mounts share one fetch + signature verification +
 * SRI registration. A successful resolution is reused for a short window
 * ({@link RESOLVE_REUSE_MS}) rather than forever, so mounts on a long-lived
 * page still re-check the manifest (and its kill switch) reasonably soon.
 * Failures are never cached.
 */
export function resolveSource(): Promise<ResolvedSource> {
  const { manifestUrl, verify } = resolveConfig();
  const key = `${verify ? 'v' : 'u'}:${manifestUrl}`;
  const now = Date.now();
  const cached = pendingResolves.get(key);
  if (cached && (cached.settledAt === undefined || now - cached.settledAt < RESOLVE_REUSE_MS)) {
    return cached.promise;
  }
  const entry: PendingResolve = {
    promise: resolveSourceOnce(manifestUrl, verify).then(
      (result) => {
        entry.settledAt = Date.now();
        return result;
      },
      (error) => {
        pendingResolves.delete(key);
        throw error;
      },
    ),
  };
  pendingResolves.set(key, entry);
  return entry.promise;
}

const RESOLVE_REUSE_MS = 60_000;

type PendingResolve = { promise: Promise<ResolvedSource>; settledAt?: number };
const pendingResolves = new Map<string, PendingResolve>();

async function resolveSourceOnce(manifestUrl: string, verify: boolean): Promise<ResolvedSource> {
  // When verifying, force a revalidation so we check the freshest bytes.
  // Otherwise let the browser HTTP cache satisfy repeated mounts.
  const { manifest, url: resolvedManifestUrl } = await fetchManifest(manifestUrl, !verify);
  if (manifest.killSwitch) {
    throw new ManifestError('kill-switch', 'manifest kill switch is set — refusing to load remote');
  }
  if (verify) {
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
