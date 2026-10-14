/**
 * Public compatibility boundary between an npm loader and the CDN remote.
 *
 * This changes only when the loader/remote contract breaks (manifest shape,
 * exposed Module Federation modules, widget props, or required host runtime).
 * It is deliberately independent from @layerswap/widget's implementation
 * version so ordinary core releases continue to roll within the same channel.
 */
export const WIDGET_PROTOCOL_MAJOR = 1;

/**
 * Read a manifest's compatibility major. The channel fallback keeps signed
 * pre-protocol-field v1 manifests usable during the migration; every newly
 * published manifest is required to carry protocolMajor explicitly.
 */
export function widgetProtocolMajorOf(manifest: {
  protocolMajor?: unknown;
  channel?: unknown;
}): number | undefined {
  if (
    Number.isInteger(manifest.protocolMajor) &&
    Number(manifest.protocolMajor) > 0
  ) {
    return Number(manifest.protocolMajor);
  }
  if (typeof manifest.channel !== "string") return undefined;
  const match = /^v([1-9]\d*)$/.exec(manifest.channel);
  return match ? Number(match[1]) : undefined;
}
