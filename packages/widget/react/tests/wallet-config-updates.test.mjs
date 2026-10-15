import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

// Exercise real React updates and error boundaries without network or a CDN.
const stub = `
  export async function resolveSource() { return { remoteEntry: 'https://unused.invalid/remoteEntry.js' }; }
  export function initRemote() {}
  export async function assertSharedLibraries() {}
  export async function loadRemoteModule(name) {
    if (name === 'walletRuntime') return () => globalThis.__walletProbe;
    return props => { globalThis.__walletRenders.push(props.wagmiConfig); return 'Remote widget'; };
  }
`;
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@layerswap/widget-js') return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(stub)}` };
  return next(specifier, context);
} });
const { RemoteWidgetHost } = await import('../dist/esm/remoteWidgetHost.js');
hooks.deregister();

test('invalid wallet config updates unmount the remote and report onError', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const originalError = console.error;
  console.error = () => {}; // Expected React error-boundary diagnostics.
  const fn = () => {};
  const modules = {
    wagmi: { createConfig: fn, useConfig: fn }, '@wagmi/core': { createConfig: fn },
    viem: { createPublicClient: fn }, '@tanstack/react-query': { QueryClient: fn },
  };
  const share = Object.fromEntries(Object.entries(modules).map(([name, module]) => [name, { lib: () => module }]));
  globalThis.__walletProbe = { wagmiCreateConfig: fn, wagmiUseConfig: fn, coreCreateConfig: fn, viemCreatePublicClient: fn, queryClient: fn };
  try {
    for (const scenario of ['late addition', 'removal', 'replacement']) {
      const config = {};
      const shared = scenario !== 'late addition';
      const errors = [];
      globalThis.__walletRenders = [];
      const root = createRoot(document.getElementById('root'));
      const render = value => root.render(React.createElement(RemoteWidgetHost, {
        expose: 'Widget', widgetProps: { wagmiConfig: value }, walletShare: shared ? share : undefined,
        fallback: 'Fallback', onError: error => errors.push(error),
      }));
      await act(async () => { render(shared ? config : undefined); });
      assert.equal(document.body.textContent, 'Remote widget', scenario);
      const rendersBeforeUpdate = globalThis.__walletRenders.length;
      await act(async () => { render(scenario === 'removal' ? undefined : {}); });
      assert.equal(errors.length, 1, scenario);
      assert.match(errors[0].message, /Import the widget|requires the existing host|Keep wagmiConfig stable/);
      assert.equal(document.body.textContent, 'Fallback', scenario);
      assert.equal(globalThis.__walletRenders.length, rendersBeforeUpdate, 'invalid config must not reach remote');
      await act(async () => root.unmount());
    }
  } finally {
    console.error = originalError;
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    delete globalThis.__walletProbe;
    delete globalThis.__walletRenders;
  }
});
