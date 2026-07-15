import { fetchManifest, resolveRemoteEntry, verifyManifest, ManifestError, DEFAULT_MANIFEST_URL } from './manifest';
import { registerChunkHashes } from './sri';

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
 */
export async function resolveSource(): Promise<ResolvedSource> {
  const { manifestUrl, verify } = resolveConfig();
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
