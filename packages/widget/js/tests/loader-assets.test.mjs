import assert from 'node:assert/strict';
import test from 'node:test';

class FakeScriptElement {
  #attributes = new Map();
  #src = '';

  getAttribute(name) {
    return this.#attributes.get(name.toLowerCase()) ?? null;
  }

  setAttribute(name, value) {
    this.#attributes.set(name.toLowerCase(), String(value));
  }

  get src() {
    return this.#src;
  }

  set src(value) {
    this.#src = String(value);
  }
}

globalThis.window = { location: { href: 'https://host.example/page' } };
globalThis.HTMLScriptElement = FakeScriptElement;
globalThis.__LAYERSWAP_WIDGET_MANIFEST__ = 'https://cdn.example/v1/manifest.json';
globalThis.__LAYERSWAP_WIDGET_VERIFY__ = false;

const remoteHash = `sha384-${'J'.repeat(64)}`;
const assetHash = `sha384-${'K'.repeat(64)}`;
globalThis.fetch = async () => ({
  ok: true,
  url: 'https://cdn.example/1.7.0-0123456789ab/manifest.json',
  json: async () => ({
    version: '1.7.0',
    remoteEntry: './remoteEntry.js',
    assetBase: '../assets/',
    chunks: {
      'remoteEntry.js': remoteHash,
      'lazy.0123456789abcdef.js': assetHash,
    },
  }),
});

const { resolveSource } = await import('../dist/esm/loader.js');

test('registers build controls and shared assets under their distinct SRI prefixes', async () => {
  const source = await resolveSource();
  assert.equal(source.remoteEntry, 'https://cdn.example/1.7.0-0123456789ab/remoteEntry.js');

  const remote = new FakeScriptElement();
  remote.src = source.remoteEntry;
  assert.equal(remote.getAttribute('integrity'), remoteHash);

  const asset = new FakeScriptElement();
  asset.src = 'https://cdn.example/1.7.0-0123456789ab/../assets/lazy.0123456789abcdef.js';
  assert.equal(asset.getAttribute('integrity'), assetHash);
});
