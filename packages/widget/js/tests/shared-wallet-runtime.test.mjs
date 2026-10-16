import assert from 'node:assert/strict';
import test from 'node:test';
import { getInstance } from '@module-federation/runtime';
import { initRemote, assertSharedLibraries } from '../dist/esm/runtime.js';

// Uses the real Module Federation selection algorithm. No scripts or RPCs load.
test('host wallet modules win over newer unloaded remote fallbacks; competing loaded copies fail', async () => {
  globalThis.window = {};
  try {
    const modules = { wagmi: {}, '@wagmi/core': {}, viem: {}, '@tanstack/react-query': {} };
    const shared = Object.fromEntries(Object.entries(modules).map(([name, lib]) => [name, {
      version: '2.14.11', lib: () => lib, loaded: true, strictVersion: true, requiredVersion: '^2.0.0',
    }]));
    initRemote('https://unused.invalid/remoteEntry.js', shared);
    const runtime = getInstance();
    for (const name of Object.keys(modules)) {
      const host = runtime.shareScopeMap.default[name]['2.14.11'];
      assert.equal(host.shareConfig.singleton, true);
      assert.equal(host.shareConfig.strictVersion, true);
      runtime.shareScopeMap.default[name]['2.99.0'] = {
        ...host, version: '2.99.0', from: 'remote-fallback', loaded: false, lib: undefined,
        get: () => () => { throw new Error('Must not instantiate a remote wallet runtime'); },
      };
    }
    await assertSharedLibraries(shared);
    const conflict = runtime.shareScopeMap.default.wagmi['2.99.0'];
    conflict.loaded = true;
    conflict.lib = () => ({ competing: true });
    await assert.rejects(assertSharedLibraries(shared), /Another wagmi runtime is already active/);
    // An initialized page cannot silently replace its sharing contract.
    assert.throws(() => initRemote('https://unused.invalid/remoteEntry.js', {
      ...shared, wagmi: { ...shared.wagmi, loaded: false },
    }), /different shared-library configuration/);
  } finally {
    delete globalThis.window;
  }
});

test('workspace lockfile does not split wagmi/core into different peer-context copies', async () => {
  const { readFile } = await import('node:fs/promises');
  const lock = await readFile(new URL('../../../../pnpm-lock.yaml', import.meta.url), 'utf8');
  const snapshots = lock.slice(lock.indexOf('\nsnapshots:\n'));
  const counts = new Map();
  for (const match of snapshots.matchAll(/^  ['"]?(@wagmi\/core|wagmi)@(\d+\.\d+\.\d+)\(/gm)) {
    const key = `${match[1]}@${match[2]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.ok(counts.size > 0, 'expected resolved wagmi/core snapshots');
  for (const [name, count] of counts) assert.equal(count, 1, `${name} has multiple peer-context instances`);
});
