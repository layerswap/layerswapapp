// Single source of truth for the build's identity, shared by rspack.config.mjs,
// build-manifest.mjs, verify-manifest.mjs, and deploy-r2.mjs so the output
// directory, R2 prefix, and manifest fields can never disagree.
//
// Two distinct concepts, deliberately kept separate:
//
//   - `buildId` — the IMMUTABLE identity of one build: `<version>-<gitSha12>`
//     (or `LAYERSWAP_RELEASE_ID` verbatim). Names the dist directory and the
//     write-once R2 prefix. The deploy workflow also triggers on changes to
//     widget-cdn/wallets/widget-js/widget-react, all of which change the
//     deployed bytes WITHOUT bumping `@layerswap/widget` — keying immutability
//     on the version alone made every such deploy collide with the previously
//     published prefix.
//   - `channel` — the rolling COMPATIBILITY pointer (`v<major>` of the widget
//     version). The Worker 302-redirects `/v1/*` to whatever buildId
//     `channels.json` currently maps it to.
//
// `version` stays the `@layerswap/widget` version — the host-facing
// compatibility number stamped into the manifest.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
// `assets` is the shared content-addressed namespace and cannot also name a
// build directory. Rolling channel names are reserved for Worker redirects.
export const BUILD_ID_RE = /^(?!v\d+$)(?!assets$)[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/;

export function isValidBuildId(value) {
    return typeof value === 'string' && BUILD_ID_RE.test(value);
}

export function resolveBuildIdentity(root) {
    // Read from the workspace symlink — `@layerswap/widget`'s `exports` map
    // doesn't expose `./package.json`, so `require.resolve(...)` throws
    // ERR_PACKAGE_PATH_NOT_EXPORTED.
    const widgetPkg = JSON.parse(
        readFileSync(join(root, 'node_modules', '@layerswap', 'widget', 'package.json'), 'utf8'),
    );
    const version = process.env.LAYERSWAP_RELEASE_VERSION || widgetPkg.version || '0.0.0';
    if (!VERSION_RE.test(version)) {
        throw new Error(`[build-id] invalid release version: ${JSON.stringify(version)}`);
    }
    const channel = `v${version.split('.')[0]}`;
    const gitSha = process.env.LAYERSWAP_GIT_SHA || process.env.GITHUB_SHA || 'local';
    const buildId = process.env.LAYERSWAP_RELEASE_ID || `${version}-${gitSha.slice(0, 12)}`;
    if (!isValidBuildId(buildId)) {
        throw new Error(`[build-id] invalid build id: ${JSON.stringify(buildId)}`);
    }
    return { version, channel, gitSha, buildId };
}
