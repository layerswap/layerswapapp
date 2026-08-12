export const ASSET_DIRECTORY = 'assets';
export const ASSET_BASE = `../${ASSET_DIRECTORY}/`;
// Rspack 1.x emits 16-character content hashes by default. Requesting a longer
// slice currently panics in its chunk-filename runtime generator.
export const CHUNK_HASH_LENGTH = 16;

const CONTENT_HASHED_ASSET_RE = new RegExp(
    `(?:^|/)[^/]+\\.[0-9a-f]{${CHUNK_HASH_LENGTH}}(?:\\.[^/]+)+$`,
    'i',
);

/**
 * Content-hashed build outputs can be shared safely by every build. Stable
 * control files stay under the immutable build prefix instead.
 */
export function isSharedAsset(relativePath) {
    return CONTENT_HASHED_ASSET_RE.test(relativePath);
}

export function deploymentKey(buildId, relativePath) {
    return isSharedAsset(relativePath)
        ? `${ASSET_DIRECTORY}/${relativePath}`
        : `${buildId}/${relativePath}`;
}

/**
 * A signed production manifest is published twice on Azure:
 *   - /<buildId>/manifest.json (immutable)
 *   - /<channel>/manifest.json (rolling pointer)
 *
 * This relative URL resolves to the same immutable remote from either
 * location, so promotion can atomically copy the already-signed manifest
 * bytes without an edge redirect or a second signature.
 */
export function remoteEntryForBuild(buildId) {
    return `../${buildId}/remoteEntry.js`;
}
