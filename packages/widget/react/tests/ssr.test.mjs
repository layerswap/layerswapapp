import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Any network activity during SSR means the browser-only loader ran on the
// server — exactly the failure this suite guards against.
globalThis.fetch = async () => {
  throw new Error('fetch must not be called during server rendering');
};

// Import the component module directly: the package's ESM output uses
// extensionless relative imports (resolved by the consumer's bundler), which
// raw Node cannot follow through index.js.
const { LayerswapWidget } = await import('../dist/esm/LayerswapWidget.js');

test('built module declares a "use client" boundary', async () => {
  const source = await readFile(new URL('../dist/esm/LayerswapWidget.js', import.meta.url), 'utf8');
  assert.match(source.trimStart(), /^['"]use client['"]/);
});

test('server render emits the fallback and never starts the remote loader', () => {
  const html = renderToString(
    React.createElement(LayerswapWidget, {
      fallback: React.createElement('div', { id: 'widget-fallback' }, 'Loading'),
    }),
  );
  assert.ok(html.includes('widget-fallback'), `expected fallback in SSR output, got: ${html}`);
});

test('server render with no fallback produces empty output without throwing', () => {
  const html = renderToString(React.createElement(LayerswapWidget, {}));
  assert.equal(html, '');
});


test('shared wagmi entry point is SSR-safe and preserves the fallback', async () => {
  const { LayerswapWidget: SharedWidget } = await import('../dist/esm/wagmi.js');
  const { createConfig, http } = await import('wagmi');
  const { mainnet } = await import('viem/chains');
  const config = createConfig({ chains: [mainnet], transports: { [mainnet.id]: http() }, storage: null });
  const html = renderToString(React.createElement(SharedWidget, {
    wagmiConfig: config,
    fallback: React.createElement('div', { id: 'shared-fallback' }, 'Loading'),
  }));
  assert.ok(html.includes('shared-fallback'));
});
