import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = { location: { href: 'https://host.example/page' } };
Object.defineProperty(globalThis, 'crypto', {
  configurable: true,
  value: {
    subtle: {
      importKey: async () => ({}),
      verify: async () => false,
    },
  },
});

globalThis.fetch = async () => ({
  ok: true,
  url: 'https://cdn.example/1.7.0-0123456789ab/manifest.json',
  json: async () => ({
    protocolMajor: 1,
    version: '1.7.0',
    remoteEntry: './remoteEntry.js',
    expiresAt: '2999-01-01T00:00:00.000Z',
    signature: 'AA==',
  }),
});

const { resolveSource } = await import('../dist/esm/loader.js');

test('the loader always rejects a manifest that fails signature verification', async () => {
  await assert.rejects(
    () => resolveSource(),
    (error) => error?.name === 'ManifestError' && error?.reason === 'signature',
  );
});
