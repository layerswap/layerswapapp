import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { deployBuild } from './deploy-r2.mjs';
import { ASSET_BASE, deploymentKey } from './cdn-layout.mjs';
import { rollbackChannel } from './rollback-r2.mjs';

const silentLogger = { log() {} };

function deployFixture(t, identity, manifestOverrides = {}) {
    const root = mkdtempSync(join(tmpdir(), 'layerswap-deploy-r2-'));
    const dist = join(root, 'dist', identity.buildId);
    mkdirSync(dist, { recursive: true });
    writeFileSync(join(dist, 'manifest.json'), JSON.stringify({
        ...identity,
        remoteEntry: './remoteEntry.js',
        assetBase: ASSET_BASE,
        chunks: {},
        signature: 'signed',
        ...manifestOverrides,
    }));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    return root;
}

test('deploy rejects a mismatched manifest before creating an R2 client', async (t) => {
    const identity = {
        buildId: '1.7.0-0123456789ab',
        version: '1.7.0',
        channel: 'v1',
        gitSha: '0123456789abcdef',
    };
    const root = deployFixture(t, identity, { buildId: '1.7.0-fedcba987654' });
    let clientsCreated = 0;

    await assert.rejects(
        deployBuild({
            root,
            identity,
            logger: silentLogger,
            createClient() {
                clientsCreated += 1;
                return {};
            },
        }),
        /manifest identity does not match this build/,
    );
    assert.equal(clientsCreated, 0);
});

test('content-hashed chunks use the shared asset namespace', () => {
    assert.equal(
        deploymentKey('1.7.0-0123456789ab', '837.0123456789abcdef.js'),
        'assets/837.0123456789abcdef.js',
    );
    assert.equal(
        deploymentKey('1.7.0-0123456789ab', 'remoteEntry.js'),
        '1.7.0-0123456789ab/remoteEntry.js',
    );
});

test('deploy reuses an existing shared asset and publishes build controls', async (t) => {
    const identity = {
        buildId: '1.7.0-0123456789ab',
        version: '1.7.0',
        channel: 'v1',
        gitSha: '0123456789abcdef',
    };
    const root = deployFixture(t, identity);
    const buildDir = join(root, 'dist', identity.buildId);
    const assetDir = join(root, 'dist', 'assets');
    const assetName = '837.0123456789abcdef.js';
    mkdirSync(assetDir, { recursive: true });
    writeFileSync(join(buildDir, 'remoteEntry.js'), 'remote');
    writeFileSync(join(assetDir, assetName), 'chunk');

    const uploadedKeys = [];
    const result = await deployBuild({
        root,
        identity,
        env: { LAYERSWAP_PROMOTE: 'false' },
        logger: silentLogger,
        createClient: () => ({ bucket: 'test' }),
        objectExists: async (_ctx, key) => key === `assets/${assetName}`,
        putObject: async (_ctx, key) => uploadedKeys.push(key),
    });

    assert.deepEqual(result, { uploaded: 2, reused: 1, promoted: false });
    assert.deepEqual(uploadedKeys, [
        `${identity.buildId}/remoteEntry.js`,
        `${identity.buildId}/manifest.json`,
    ]);
});

test('deploy uploads payloads concurrently and publishes the manifest last', async (t) => {
    const identity = {
        buildId: '1.7.0-0123456789ab',
        version: '1.7.0',
        channel: 'v1',
        gitSha: '0123456789abcdef',
    };
    const root = deployFixture(t, identity);
    const buildDir = join(root, 'dist', identity.buildId);
    const assetDir = join(root, 'dist', 'assets');
    mkdirSync(assetDir, { recursive: true });
    writeFileSync(join(buildDir, 'remoteEntry.js'), 'remote');
    writeFileSync(join(assetDir, 'one.0123456789abcdef.js'), 'one');
    writeFileSync(join(assetDir, 'two.fedcba9876543210.js'), 'two');

    let activePayloadUploads = 0;
    let maxActivePayloadUploads = 0;
    const completedKeys = [];
    await deployBuild({
        root,
        identity,
        env: { LAYERSWAP_PROMOTE: 'false' },
        logger: silentLogger,
        uploadConcurrency: 2,
        createClient: () => ({ bucket: 'test' }),
        objectExists: async () => false,
        putObject: async (_ctx, key) => {
            if (key.endsWith('/manifest.json')) {
                assert.equal(activePayloadUploads, 0, 'manifest started before payloads finished');
            } else {
                activePayloadUploads += 1;
                maxActivePayloadUploads = Math.max(maxActivePayloadUploads, activePayloadUploads);
                await new Promise(resolve => setTimeout(resolve, 10));
                activePayloadUploads -= 1;
            }
            completedKeys.push(key);
        },
    });

    assert.equal(maxActivePayloadUploads, 2);
    assert.equal(completedKeys.at(-1), `${identity.buildId}/manifest.json`);
});

test('rollback updates a channel only for a matching published manifest', async () => {
    const writes = [];
    const result = await rollbackChannel({
        channel: 'v1',
        buildId: '1.7.0-0123456789ab',
        ctx: {},
        logger: silentLogger,
        readManifest: async () => ({ buildId: '1.7.0-0123456789ab', channel: 'v1' }),
        readChannelMap: async () => ({ v1: '1.6.0-aaaaaaaaaaaa' }),
        writeChannelMap: async (_ctx, channels) => writes.push({ ...channels }),
    });

    assert.equal(result.changed, true);
    assert.deepEqual(writes, [{ v1: '1.7.0-0123456789ab' }]);
});

test('rollback rejects a missing target without changing the channel', async () => {
    let writes = 0;
    await assert.rejects(
        rollbackChannel({
            channel: 'v1',
            buildId: '1.7.0-0123456789ab',
            ctx: {},
            logger: silentLogger,
            readManifest: async () => undefined,
            readChannelMap: async () => ({}),
            writeChannelMap: async () => { writes += 1; },
        }),
        /is not published/,
    );
    assert.equal(writes, 0);
});

test('rollback rejects a build from another major channel', async () => {
    let writes = 0;
    await assert.rejects(
        rollbackChannel({
            channel: 'v1',
            buildId: '2.0.0-0123456789ab',
            ctx: {},
            logger: silentLogger,
            readManifest: async () => ({ buildId: '2.0.0-0123456789ab', channel: 'v2' }),
            readChannelMap: async () => ({}),
            writeChannelMap: async () => { writes += 1; },
        }),
        /on v2, not v1/,
    );
    assert.equal(writes, 0);
});
