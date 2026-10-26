import assert from 'node:assert/strict';
import test, { after, afterEach, beforeEach } from 'node:test';
import { createRequire, registerHooks } from 'node:module';
import { extname } from 'node:path';
import { existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const previous = Object.getOwnPropertyDescriptors(globalThis);
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
      const file = `${specifier}.js`;
      return nextResolve(existsSync(new URL(file, context.parentURL)) ? file : `${specifier}/index.js`, context);
    }
    if (context.parentURL?.endsWith('/useHostWalletStatus.ts') && specifier === './hostWallet') {
      return nextResolve('./hostWallet.ts', context);
    }
    return nextResolve(specifier, context);
  },
});
const { createRoot } = await import('react-dom/client');
const { WalletProvidersRegistryProvider } = await import('../../../wallets/core/dist/esm/context/WalletProvidersRegistryProvider.js');
const { DepositStepProvider, useDepositStep, useReportCloseLock } = await import('../dist/esm/components/Pages/Deposit/depositStepContext.js');
const { DepositSettingsProvider, useDepositSettings } = await import('../dist/esm/context/depositSettings.js');
const { useHostWalletStatus } = await import('../../../../apps/widget-cdn/src/useHostWalletStatus.ts');
const appRequire = createRequire(new URL('../../../../apps/widget-cdn/package.json', import.meta.url));
const { createConfig } = await import(appRequire.resolve('wagmi'));

let root;
let container;
let navigation;
const providers = [{ id: 'evm', loadProvider: async () => { throw new Error('SDK must stay lazy'); } }];
const networks = [];
const networkAdapter = {};

function ReadSettings() {
  const { methods } = useDepositSettings();
  return createElement('output', { 'data-methods': true }, methods.join(','));
}
function Probe({ methods, completed = false }) {
  navigation = useDepositStep();
  useReportCloseLock(false, completed);
  return createElement(DepositSettingsProvider, { value: { methods, depositAddressOnly: navigation.depositAddressOnly } },
    createElement('output', { 'data-step': true }, navigation.step),
    createElement(ReadSettings));
}
async function render(status = 'other', methods, walletProviders = providers, completed = false) {
  await act(() => root.render(createElement(WalletProvidersRegistryProvider, { walletProviders, networks, networkAdapter },
    createElement(DepositStepProvider, { hostWalletStatus: status }, createElement(Probe, { methods, completed })))));
}
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
});
after(() => {
  hooks.deregister();
  dom.window.close();
  for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
    if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
    else delete globalThis[key];
  }
});

test('embedded wallets open directly on deposit addresses and override every method list', async () => {
  for (const methods of [undefined, [], ['wallet'], ['polymarket', 'hyperliquid']]) {
    await render('embedded', methods);
    assert.equal(navigation.step, 'transfer-crypto');
    assert.equal(navigation.canGoBack, false);
    assert.equal(navigation.hasWalletMethods, false, 'destination picker must remain visible at the flow root');
    assert.equal(container.querySelector('[data-methods]').textContent, 'deposit_address');
  }
  await act(() => navigation.push('method-picker'));
  await act(() => navigation.replace('wallet-connect'));
  await act(() => navigation.back());
  assert.equal(navigation.step, 'transfer-crypto');
  assert.equal(navigation.canGoBack, false);
});

test('external and address-only integrations retain their existing method rules', async () => {
  await render('other', ['wallet', 'polymarket']);
  assert.equal(navigation.step, 'method-picker');
  assert.equal(container.querySelector('[data-methods]').textContent, 'wallet,polymarket');
  await render('other', undefined, []);
  assert.equal(navigation.step, 'transfer-crypto');
});

test('reconnect and idle connector changes re-root navigation without leaving a Back escape', async () => {
  await render();
  await act(() => navigation.push('wallet-connect'));
  await render('loading');
  assert.equal(navigation.step, 'host-wallet-loading');
  await act(() => navigation.push('wallet-source'));
  assert.equal(navigation.step, 'host-wallet-loading');
  await render('embedded');
  assert.equal(navigation.step, 'transfer-crypto');
  assert.equal(navigation.canGoBack, false);
  await render('other');
  assert.equal(navigation.step, 'method-picker');
});

test('a processing transfer and its completion survive host reconnect/logout until reset', async () => {
  await render('other', ['wallet']);
  await act(() => navigation.push('wallet-processing'));
  await act(() => navigation.setCloseLocked(true));
  await render('loading', ['wallet']);
  assert.equal(navigation.step, 'wallet-processing');
  await render('embedded', ['wallet']);
  assert.equal(navigation.step, 'wallet-processing');
  assert.equal(container.querySelector('[data-methods]').textContent, 'wallet');
  await act(() => navigation.setCloseLocked(false));
  assert.equal(navigation.step, 'wallet-processing', 'keep the result after close unlocks');
  await act(() => navigation.reset());
  assert.equal(navigation.step, 'transfer-crypto');
  assert.equal(container.querySelector('[data-methods]').textContent, 'deposit_address');
});

test('an embedded deposit keeps its address and result on disconnect; reopening uses the latest connector', async () => {
  await render('embedded');
  await act(() => navigation.setCloseLocked(true));
  await render('other');
  await act(() => navigation.setCloseLocked(false));
  assert.equal(navigation.step, 'transfer-crypto');
  assert.equal(navigation.depositAddressOnly, true);
  await act(() => root.unmount());
  root = createRoot(container);
  await render('other');
  assert.equal(navigation.step, 'method-picker');
});

test('a deposit first observed as completed preserves its result without having locked close', async () => {
  await render('embedded', undefined, providers, true);
  assert.equal(navigation.closeLocked, false);
  await render('other', undefined, providers, true);
  assert.equal(navigation.step, 'transfer-crypto');
  assert.equal(navigation.depositAddressOnly, true);
});

test('the host subscription updates mounted routing and switches config subscriptions cleanly', async () => {
  const chain = { id: 1, name: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [] } } };
  const makeConfig = () => createConfig({ chains: [chain], connectors: [], storage: null, ssr: true, multiInjectedProviderDiscovery: false });
  const first = makeConfig();
  const second = makeConfig();
  const address = '0x1234567890123456789012345678901234567890';
  function setAccount(config, id, status) {
    const connector = { id, uid: id };
    config.setState(state => ({ ...state, current: id, status, connections: new Map([[id, { connector, accounts: [address], chainId: 1 }]]) }));
  }
  function HostRouting({ config }) {
    const hostWalletStatus = useHostWalletStatus(config);
    return createElement(WalletProvidersRegistryProvider, { walletProviders: providers, networks, networkAdapter },
      createElement(DepositStepProvider, { hostWalletStatus }, createElement(Probe)));
  }
  await act(() => root.render(createElement(HostRouting, { config: first })));
  assert.equal(navigation.step, 'method-picker');
  await act(() => setAccount(first, 'io.privy.wallet', 'reconnecting'));
  assert.equal(navigation.step, 'host-wallet-loading');
  await act(() => setAccount(first, 'io.privy.wallet', 'connected'));
  assert.equal(navigation.step, 'transfer-crypto');
  await act(() => root.render(createElement(HostRouting, { config: second })));
  assert.equal(navigation.step, 'method-picker');
  await act(() => setAccount(first, 'io.metamask', 'connected'));
  assert.equal(navigation.step, 'method-picker');
  await act(() => setAccount(second, 'dynamic-dynamicwaas-1', 'connected'));
  assert.equal(navigation.step, 'transfer-crypto');
  await act(() => root.render(createElement(HostRouting, { config: undefined })));
  assert.equal(navigation.step, 'method-picker');
});
