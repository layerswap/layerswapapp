import assert from 'node:assert/strict';
import test, { after, afterEach, beforeEach } from 'node:test';
import { createRequire, registerHooks } from 'node:module';
import { extname } from 'node:path';
import { existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { act, createElement, useEffect } from 'react';

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
const { connect } = await import(appRequire.resolve('wagmi/actions'));

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
  return createElement(DepositSettingsProvider, { value: { methods, embeddedHostWallet: navigation.embeddedHostWallet } },
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

test('embedded logins keep the picker and external-wallet flow while overriding every method list', async () => {
  for (const methods of [undefined, [], ['wallet'], ['polymarket', 'hyperliquid']]) {
    await render('embedded', methods);
    assert.equal(navigation.step, 'method-picker');
    assert.equal(navigation.canGoBack, false);
    assert.equal(navigation.hasWalletMethods, true, 'More wallets must remain available');
    assert.equal(container.querySelector('[data-methods]').textContent, 'deposit_address');
  }
  await act(() => navigation.push('transfer-crypto'));
  assert.equal(navigation.step, 'transfer-crypto');
  await act(() => navigation.back());
  assert.equal(navigation.step, 'method-picker');
  await act(() => navigation.push('wallet-connect'));
  assert.equal(navigation.step, 'wallet-connect');
  await act(() => navigation.replace('wallet-source'));
  assert.equal(navigation.step, 'wallet-source');
  await act(() => navigation.back());
  assert.equal(navigation.step, 'method-picker');
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
  await render('loading');
  assert.equal(navigation.step, 'host-wallet-loading');
  await act(() => navigation.push('wallet-source'));
  assert.equal(navigation.step, 'host-wallet-loading');
  await render('embedded');
  assert.equal(navigation.step, 'method-picker');
  assert.equal(navigation.canGoBack, false);
  await render('other');
  assert.equal(navigation.step, 'method-picker');
});

for (const scenario of [
  { name: 'first QR connection', connectorId: 'walletConnect' },
  { name: 'More wallets', connectorId: 'walletConnect', alreadyConnected: true },
  { name: 'extended source approval', connectorId: 'io.metamask', preset: 'POLYMARKET_MAINNET' },
  { name: 'embedded connection', connectorId: 'io.privy.wallet' },
  { name: 'rejected approval', connectorId: 'walletConnect', reject: true },
]) {
  test(`pending ${scenario.name} keeps its UI and source preset until the connection settles`, async () => {
    const chain = { id: 1, name: 'Ethereum', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [] } } };
    const config = createConfig({ chains: [chain], connectors: [], storage: null, ssr: true, multiInjectedProviderDiscovery: false });
    const address = '0x1234567890123456789012345678901234567890';
    if (scenario.alreadyConnected) {
      const connector = { id: 'io.metamask', uid: 'login' };
      config.setState(state => ({ ...state, status: 'connected', current: connector.uid, connections: new Map([[connector.uid, { connector, accounts: [address], chainId: 1 }]]) }));
    }
    let finish;
    let reject;
    const connector = config._internal.connectors.setup(() => ({
      id: scenario.connectorId, name: 'Funding wallet', type: 'test',
      connect: () => new Promise((resolve, fail) => { finish = resolve; reject = fail; }),
    }));
    let mounts = 0;
    let unmounts = 0;
    function PendingConnectView() {
      useEffect(() => { mounts++; return () => { unmounts++; }; }, []);
      return createElement('div', { 'data-approval': true }, 'Scan QR or approve in your wallet');
    }
    function RouteProbe() {
      navigation = useDepositStep();
      return navigation.step === 'wallet-connect' ? createElement(PendingConnectView) : navigation.step;
    }
    function HostRouting() {
      const hostWalletStatus = useHostWalletStatus(config);
      return createElement(WalletProvidersRegistryProvider, { walletProviders: providers, networks, networkAdapter },
        createElement(DepositStepProvider, { hostWalletStatus }, createElement(RouteProbe)));
    }
    await act(() => root.render(createElement(HostRouting)));
    await act(() => {
      navigation.setPresetSourceNetwork(scenario.preset);
      navigation.push('wallet-connect');
    });
    let connection;
    await act(async () => { connection = connect(config, { connector }).catch(error => error); });
    try {
      assert.equal(config.state.status, 'connecting');
      assert.equal(navigation.step, 'wallet-connect');
      assert.ok(container.querySelector('[data-approval]'));
      assert.equal(mounts, 1);
      assert.equal(unmounts, 0, 'pending approval must never run connect-view cleanup');
      assert.equal(navigation.presetSourceNetwork, scenario.preset);
      assert.equal(navigation.embeddedHostWallet, false);
    } finally {
      await act(async () => {
        if (scenario.reject) reject(new Error('User rejected connection'));
        else finish({ accounts: [address], chainId: 1 });
        await connection;
      });
    }
    if (scenario.connectorId === 'io.privy.wallet') {
      assert.equal(navigation.step, 'method-picker');
      assert.equal(navigation.embeddedHostWallet, true);
      assert.equal(navigation.canGoBack, false);
      assert.equal(unmounts, 1);
    } else {
      assert.equal(navigation.step, 'wallet-connect');
      assert.equal(navigation.presetSourceNetwork, scenario.preset);
      assert.equal(unmounts, 0);
      assert.equal(navigation.embeddedHostWallet, false);
      await act(() => navigation.back());
      assert.equal(navigation.step, 'method-picker');
      assert.equal(unmounts, 1);
    }
  });
}

for (const switchBeforeCancel of [false, true]) {
  test(`canceling processing releases routing when the host changes ${switchBeforeCancel ? 'before' : 'after'} cancellation`, async () => {
    await render();
    await act(() => navigation.push('wallet-amount'));
    await act(() => navigation.push('wallet-processing'));
    await act(() => navigation.setCloseLocked(true));
    if (switchBeforeCancel) await render('embedded');
    await act(() => navigation.back());
    assert.equal(navigation.closeLocked, false);
    if (!switchBeforeCancel) {
      assert.equal(navigation.step, 'wallet-amount');
      await act(() => navigation.back());
      await render('embedded');
    }
    assert.equal(navigation.step, 'method-picker');
    assert.equal(navigation.embeddedHostWallet, true);
    assert.equal(navigation.hasWalletMethods, true);
    assert.equal(navigation.canGoBack, false);
    assert.equal(container.querySelector('[data-methods]').textContent, 'deposit_address');
  });
}

test('starting another deposit releases the preserved route while retaining an unchanged address flow', async () => {
  await render();
  await act(() => navigation.push('transfer-crypto'));
  await act(() => navigation.preserveRouting());
  await act(() => navigation.startNewDeposit());
  assert.equal(navigation.step, 'transfer-crypto');
  await act(() => navigation.preserveRouting());
  await render('embedded');
  assert.equal(navigation.embeddedHostWallet, false, 'keep the previous result until an explicit new deposit');
  await act(() => navigation.startNewDeposit());
  assert.equal(navigation.step, 'method-picker');
  assert.equal(navigation.embeddedHostWallet, true);
  assert.equal(navigation.canGoBack, false);
  await render('other');
  assert.equal(navigation.step, 'method-picker', 'the new session is no longer frozen');
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
  assert.equal(navigation.step, 'method-picker');
  assert.equal(container.querySelector('[data-methods]').textContent, 'deposit_address');
});

test('an embedded deposit keeps its address and result on disconnect; reopening uses the latest connector', async () => {
  await render('embedded');
  await act(() => navigation.push('transfer-crypto'));
  await act(() => navigation.setCloseLocked(true));
  await render('other');
  await act(() => navigation.setCloseLocked(false));
  assert.equal(navigation.step, 'transfer-crypto');
  assert.equal(navigation.embeddedHostWallet, true);
  await act(() => root.unmount());
  root = createRoot(container);
  await render('other');
  assert.equal(navigation.step, 'method-picker');
});

test('a deposit first observed as completed preserves its result without having locked close', async () => {
  await render('embedded');
  await act(() => navigation.push('transfer-crypto'));
  await render('embedded', undefined, providers, true);
  assert.equal(navigation.closeLocked, false);
  await render('other', undefined, providers, true);
  assert.equal(navigation.step, 'transfer-crypto');
  assert.equal(navigation.embeddedHostWallet, true);
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
  assert.equal(navigation.step, 'method-picker');
  assert.equal(navigation.embeddedHostWallet, true);
  await act(() => root.render(createElement(HostRouting, { config: second })));
  assert.equal(navigation.step, 'method-picker');
  await act(() => setAccount(first, 'io.metamask', 'connected'));
  assert.equal(navigation.step, 'method-picker');
  await act(() => setAccount(second, 'dynamic-dynamicwaas-1', 'connected'));
  assert.equal(navigation.step, 'method-picker');
  assert.equal(navigation.embeddedHostWallet, true);
  // Funding-wallet activation and later login removal can leave the active
  // account unchanged. The connection subscription must still update policy.
  await act(() => second.setState(state => {
    const connector = { id: 'io.metamask', uid: 'funding' };
    const connections = new Map(state.connections);
    connections.set(connector.uid, { connector, accounts: [address], chainId: 1 });
    return { ...state, current: connector.uid, connections };
  }));
  assert.equal(navigation.embeddedHostWallet, true);
  await act(() => second.setState(state => {
    const connections = new Map(state.connections);
    connections.delete('dynamic-dynamicwaas-1');
    return { ...state, connections };
  }));
  assert.equal(navigation.embeddedHostWallet, false);
  await act(() => root.render(createElement(HostRouting, { config: undefined })));
  assert.equal(navigation.step, 'method-picker');
});
