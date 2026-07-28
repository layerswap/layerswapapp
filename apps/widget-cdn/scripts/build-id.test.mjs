import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { isValidBuildId, resolveBuildIdentity } from './build-id.mjs';

function fixtureRoot(t, version = '1.7.0') {
    const root = mkdtempSync(join(tmpdir(), 'layerswap-build-id-'));
    const widgetDir = join(root, 'node_modules', '@layerswap', 'widget');
    mkdirSync(widgetDir, { recursive: true });
    writeFileSync(join(widgetDir, 'package.json'), JSON.stringify({ version }));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
}

function withEnv(overrides, run) {
    const previous = new Map(
        Object.keys(overrides).map((key) => [key, Object.hasOwn(process.env, key) ? process.env[key] : undefined]),
    );
    try {
        for (const [key, value] of Object.entries(overrides)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
        return run();
    } finally {
        for (const [key, value] of previous) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

test('accepts a normal version-plus-SHA build identity', (t) => {
    const root = fixtureRoot(t);
    const identity = withEnv({
        LAYERSWAP_RELEASE_VERSION: undefined,
        LAYERSWAP_RELEASE_ID: undefined,
        LAYERSWAP_GIT_SHA: '0123456789abcdef',
        GITHUB_SHA: undefined,
    }, () => resolveBuildIdentity(root));

    assert.deepEqual(identity, {
        version: '1.7.0',
        channel: 'v1',
        gitSha: '0123456789abcdef',
        buildId: '1.7.0-0123456789ab',
    });
});

test('rejects unsafe and channel-shadowing build IDs', (t) => {
    const root = fixtureRoot(t);
    const invalid = ['v1', 'assets', '../outside', '//host', 'a'.repeat(129)];

    for (const buildId of invalid) {
        assert.equal(isValidBuildId(buildId), false);
        assert.throws(
            () => withEnv({ LAYERSWAP_RELEASE_ID: buildId }, () => resolveBuildIdentity(root)),
            /invalid build id/,
        );
    }
});

test('rejects malformed release versions', (t) => {
    const root = fixtureRoot(t);
    for (const version of ['1', '1.2', 'v1.2.3', '01.2.3', '1.2.3/../outside']) {
        assert.throws(
            () => withEnv({ LAYERSWAP_RELEASE_VERSION: version }, () => resolveBuildIdentity(root)),
            /invalid release version/,
        );
    }
});

test('accepts semver prerelease and build metadata', (t) => {
    const root = fixtureRoot(t);
    const identity = withEnv({
        LAYERSWAP_RELEASE_VERSION: '2.0.0-beta.1+build.2',
        LAYERSWAP_RELEASE_ID: undefined,
        LAYERSWAP_GIT_SHA: 'abcdef0123456789',
    }, () => resolveBuildIdentity(root));

    assert.equal(identity.channel, 'v2');
    assert.equal(identity.buildId, '2.0.0-beta.1+build.2-abcdef012345');
});
