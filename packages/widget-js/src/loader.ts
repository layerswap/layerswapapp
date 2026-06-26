import { fetchManifest, resolveRemoteEntry, verifyManifest, ManifestError } from './manifest';
import { registerChunkHashes } from './sri';

export type ResolveOptions = {
  /**
   * URL to a `manifest.json` describing the active build. The loader fetches
   * the manifest first, then the `remoteEntry` it points at — enabling atomic
   * rollback, channel pinning, and signature verification.
   */
  manifest: string;
  /**
   * When true, require a valid signature on the manifest against the baked-in
   * public key. Manifests without a signature or with an invalid one are
   * rejected. Default false until a real signing key is wired in CI.
   */
  verify?: boolean;
};

export type ResolvedSource = { remoteEntry: string };

/**
 * Fetch + validate the manifest and install per-chunk SRI, returning the
 * resolved remoteEntry URL. Framework-agnostic — shared by the vanilla
 * `mountWidget` and the React `LayerswapWidget` so the security-critical path
 * (signature check + SRI registration) lives in exactly one place.
 */
export async function resolveSource(options: ResolveOptions): Promise<ResolvedSource> {
  if (!options.manifest) {
    throw new Error('[layerswap/widget-js] `manifest` is required');
  }
  // When verifying, force a revalidation so we check the freshest bytes.
  // Otherwise let the browser HTTP cache satisfy repeated mounts.
  const { manifest, url: resolvedManifestUrl } = await fetchManifest(options.manifest, !options.verify);
  if (manifest.killSwitch) {
    throw new ManifestError('kill-switch', 'manifest kill switch is set — refusing to load remote');
  }
  if (options.verify) {
    const ok = await verifyManifest(manifest);
    if (!ok) {
      throw new ManifestError('signature', 'manifest signature is missing or invalid');
    }
  }
  // Resolve against the manifest's FINAL (post-redirect) URL, not the URL the
  // caller passed. A rolling channel URL (`/v1/manifest.json`) 302-redirects to
  // an immutable build (`/1.5.0/manifest.json`); resolving the relative
  // `remoteEntry` against that lands the remote — and, via MF's `publicPath:
  // 'auto'`, every chunk it loads — at the immutable `/1.5.0/` path.
  const remoteEntry = resolveRemoteEntry(resolvedManifestUrl, manifest.remoteEntry);
  // Install per-chunk SRI BEFORE MF runtime starts loading scripts. Once
  // the manifest's signed body is trusted, its `chunks` map pins the bytes
  // of every JS file the browser will fetch from our origin — including
  // remoteEntry.js and every lazy chunk loaded later.
  if (manifest.chunks && Object.keys(manifest.chunks).length > 0) {
    registerChunkHashes(remoteEntry, manifest.chunks);
  }
  return { remoteEntry };
}
