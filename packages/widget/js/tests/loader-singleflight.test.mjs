import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = { location: { href: 'https://host.example/page' } };
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: {
    subtle: {
      importKey: async () => ({}),
      verify: async () => true,
    },
  },
});

let fetchCount = 0;
let failNext = false;
let requestedManifestUrl;
globalThis.fetch = async (url) => {
  fetchCount++;
  requestedManifestUrl = url;
  if (failNext) {
    failNext = false;
    return { ok: false, status: 503, url: 'https://cdn.example/v1/manifest.json', json: async () => ({}) };
  }
  return {
    ok: true,
    url: 'https://cdn.example/1.7.0-0123456789ab/manifest.json',
    json: async () => ({
      protocolMajor: 1,
      version: '1.7.0',
      remoteEntry: './remoteEntry.js',
      expiresAt: '2999-01-01T00:00:00.000Z',
      signature: 'AA==',
    }),
  };
};

const { resolveSource } = await import('../dist/esm/loader.js');

test('a failed resolution is not cached', async () => {
  failNext = true;
  await assert.rejects(() => resolveSource());
  const failedCount = fetchCount;
  const retry = await resolveSource();
  assert.equal(fetchCount, failedCount + 1);
  assert.equal(retry.remoteEntry, 'https://cdn.example/1.7.0-0123456789ab/remoteEntry.js');
});

test('the manifest source is fixed by the loader and single-flighted across concurrent mounts', async () => {
  const before = fetchCount;
  const realDateNow = Date.now;
  Date.now = () => realDateNow() + 60_001;
  try {
    const [a, b, c] = await Promise.all([resolveSource(), resolveSource(), resolveSource()]);
    assert.equal(fetchCount, before + 1);
    assert.equal(requestedManifestUrl, 'https://layerswapcdntest.blob.core.windows.net/widget-cdn/v1/manifest.json');
    assert.equal(a.remoteEntry, b.remoteEntry);
    assert.equal(b.remoteEntry, c.remoteEntry);
  } finally {
    Date.now = realDateNow;
  }
});
