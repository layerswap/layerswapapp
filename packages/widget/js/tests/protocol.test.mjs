import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = { location: { href: 'https://host.example/page' } };
globalThis.__LAYERSWAP_WIDGET_MANIFEST__ = 'https://cdn.example/v1/manifest.json';
globalThis.__LAYERSWAP_WIDGET_VERIFY__ = false;

const { WIDGET_PROTOCOL_MAJOR } = await import('../dist/esm/index.js');

test('the loader package major matches the supported widget protocol', async () => {
  const { readFile } = await import('node:fs/promises');
  const loaderPackage = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  );
  assert.equal(Number(loaderPackage.version.split('.')[0]), WIDGET_PROTOCOL_MAJOR);
});

test('rejects a remote from another protocol major', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    url: 'https://cdn.example/2.0.0-0123456789ab/manifest.json',
    json: async () => ({
      protocolMajor: WIDGET_PROTOCOL_MAJOR + 1,
      version: '2.0.0',
      remoteEntry: './remoteEntry.js',
    }),
  });

  const { resolveSource } = await import('../dist/esm/loader.js');
  await assert.rejects(
    () => resolveSource(),
    (error) => error?.name === 'ManifestError' && error?.reason === 'incompatible',
  );
});

test('accepts a signed legacy manifest whose channel identifies protocol v1', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    url: 'https://cdn.example/1.7.0-legacy/manifest.json',
    json: async () => ({
      channel: 'v1',
      version: '1.7.0',
      remoteEntry: './remoteEntry.js',
    }),
  });

  const { resolveSource } = await import('../dist/esm/loader.js');
  const source = await resolveSource();
  assert.equal(source.remoteEntry, 'https://cdn.example/1.7.0-legacy/remoteEntry.js');
});
