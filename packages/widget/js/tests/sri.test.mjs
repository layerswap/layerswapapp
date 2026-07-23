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

const { registerChunkHashes } = await import('../dist/esm/sri.js');

test('retains SRI protection for delayed chunks for the life of the page', () => {
  const hash = `sha384-${'B'.repeat(64)}`;
  registerChunkHashes('https://cdn.example/widget/build-a/remoteEntry.js', {
    'lazy.1234.js': hash,
  });

  // This assignment represents a chunk request made after its original
  // widget root has unmounted. No component-owned cleanup can disable SRI.
  const script = new FakeScriptElement();
  script.src = 'https://cdn.example/widget/build-a/lazy.1234.js';

  assert.equal(script.getAttribute('integrity'), hash);
  assert.equal(script.getAttribute('crossorigin'), 'anonymous');
});

test('fails closed for an unmanifested chunk under a retained build prefix', () => {
  registerChunkHashes('https://cdn.example/widget/build-b/remoteEntry.js', {
    'known.js': `sha384-${'C'.repeat(64)}`,
  });

  const script = new FakeScriptElement();
  script.src = 'https://cdn.example/widget/build-b/unknown.js';

  assert.match(script.getAttribute('integrity'), /^sha384-A{64}$/);
  assert.equal(script.getAttribute('crossorigin'), 'anonymous');
});

test('allows identical registration but rejects rebinding an immutable prefix', () => {
  const remote = 'https://cdn.example/widget/build-c/remoteEntry.js';
  const hashes = { 'chunk.js': `sha384-${'D'.repeat(64)}` };

  registerChunkHashes(remote, hashes);
  assert.doesNotThrow(() => registerChunkHashes(remote, { ...hashes }));
  assert.throws(
    () => registerChunkHashes(remote, { 'chunk.js': `sha384-${'E'.repeat(64)}` }),
    /conflicting SRI maps for immutable prefix/,
  );
});

test('merges SRI maps for a shared content-addressed asset prefix', () => {
  const prefix = 'https://cdn.example/widget/assets/';
  const firstHash = `sha384-${'F'.repeat(64)}`;
  const secondHash = `sha384-${'G'.repeat(64)}`;

  registerChunkHashes(prefix, { 'first.1111.js': firstHash }, { merge: true });
  registerChunkHashes(prefix, { 'second.2222.js': secondHash }, { merge: true });

  const first = new FakeScriptElement();
  first.src = `${prefix}first.1111.js`;
  const second = new FakeScriptElement();
  second.src = `${prefix}second.2222.js`;

  assert.equal(first.getAttribute('integrity'), firstHash);
  assert.equal(second.getAttribute('integrity'), secondHash);
});

test('rejects a filename collision in the shared asset prefix', () => {
  const prefix = 'https://cdn.example/widget/collision-assets/';
  registerChunkHashes(prefix, { 'same.1234.js': `sha384-${'H'.repeat(64)}` }, { merge: true });

  assert.throws(
    () => registerChunkHashes(
      prefix,
      { 'same.1234.js': `sha384-${'I'.repeat(64)}` },
      { merge: true },
    ),
    /conflicting SRI hash for content-addressed asset/,
  );
});
