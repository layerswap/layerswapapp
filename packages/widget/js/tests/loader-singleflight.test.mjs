import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = { location: { href: 'https://host.example/page' } };
globalThis.__LAYERSWAP_WIDGET_MANIFEST__ = 'https://cdn.example/v1/manifest.json';
globalThis.__LAYERSWAP_WIDGET_VERIFY__ = false;

let fetchCount = 0;
let failNext = false;
globalThis.fetch = async () => {
  fetchCount++;
  if (failNext) {
    failNext = false;
    return { ok: false, status: 503, url: 'https://cdn.example/v1/manifest.json', json: async () => ({}) };
  }
  return {
    ok: true,
    url: 'https://cdn.example/1.7.0-0123456789ab/manifest.json',
    json: async () => ({
      version: '1.7.0',
      remoteEntry: './remoteEntry.js',
    }),
  };
};

const { resolveSource } = await import('../dist/esm/loader.js');

test('concurrent mounts share a single manifest fetch and verification', async () => {
  const before = fetchCount;
  const [a, b, c] = await Promise.all([resolveSource(), resolveSource(), resolveSource()]);
  assert.equal(fetchCount, before + 1);
  assert.equal(a.remoteEntry, b.remoteEntry);
  assert.equal(b.remoteEntry, c.remoteEntry);
});

test('a failed resolution is not cached', async () => {
  // Point at a distinct manifest URL so this test does not hit the fresh
  // success cached by the previous test.
  globalThis.__LAYERSWAP_WIDGET_MANIFEST__ = 'https://cdn.example/v2/manifest.json';
  failNext = true;
  await assert.rejects(() => resolveSource());
  const failedCount = fetchCount;
  const retry = await resolveSource();
  assert.equal(fetchCount, failedCount + 1);
  assert.equal(retry.remoteEntry, 'https://cdn.example/1.7.0-0123456789ab/remoteEntry.js');
});
