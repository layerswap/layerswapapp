import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { createConfig, getAccount } from '@wagmi/core';
import { mainnet } from 'wagmi/chains';
import { createPrivyWagmiBridge } from '../src/components/auth/privy-wagmi-bridge.ts';
import { areWalletAddressesEqual, getReownAddress } from '../src/components/auth/wallet-session.ts';

const firstAddress = '0x1234567890123456789012345678901234567890';
const secondAddress = '0x2345678901234567890123456789012345678901';
function fixture(address = firstAddress) {
  const events = new EventEmitter();
  const requests = [];
  const provider = {
    on: events.on.bind(events),
    removeListener: events.removeListener.bind(events),
    async request({ method }) {
      requests.push(method);
      if (method === 'eth_accounts') return [address];
      if (method === 'eth_chainId') return '0x1';
      throw new Error(`Unexpected request: ${method}`);
    },
  };
  const wallet = { address, meta: { id: 'io.privy.wallet', name: 'Privy' }, walletClientType: 'privy', getEthereumProvider: async () => provider };
  const config = createConfig({ chains: [mainnet], connectors: [], storage: null, ssr: true, multiInjectedProviderDiscovery: false });
  return { events, requests, provider, wallet, config, bridge: createPrivyWagmiBridge(config) };
}

test('shares an authenticated Privy connection with its canonical ID and cleans up without revoking login', async () => {
  const { config, bridge, wallet, events, requests } = fixture();
  await bridge.sync(wallet);
  assert.equal(getAccount(config).address, firstAddress);
  assert.equal(getAccount(config).connector.id, `io.privy.wallet.${firstAddress}`);
  assert.equal(getAccount(config).connector.type, 'privy-session');
  assert.equal(events.listenerCount('accountsChanged'), 1);
  await bridge.sync(wallet);
  assert.equal(config.state.connections.size, 1);
  assert.equal(events.listenerCount('accountsChanged'), 1);
  events.emit('accountsChanged', [secondAddress]);
  assert.equal(getAccount(config).address, secondAddress);
  events.emit('chainChanged', '0xa4b1');
  assert.equal(getAccount(config).chainId, 42161);
  await bridge.sync(null);
  assert.equal(getAccount(config).status, 'disconnected');
  assert.equal(events.eventNames().length, 0);
  assert.ok(requests.every(method => ['eth_accounts', 'eth_chainId'].includes(method)));
  events.emit('accountsChanged', [firstAddress]);
  assert.equal(getAccount(config).status, 'disconnected', 'old events must not restore a logged-out session');
});

test('a slow provider lookup cannot reconnect after logout', async () => {
  const { config, bridge, wallet, provider, requests } = fixture();
  let resolveProvider;
  const connecting = bridge.sync({ ...wallet, getEthereumProvider: () => new Promise(resolve => { resolveProvider = resolve; }) });
  await new Promise(setImmediate);
  const loggingOut = bridge.sync(null);
  await loggingOut;
  assert.equal(config.state.connections.size, 0, 'logout does not wait for the provider lookup');
  resolveProvider(provider);
  await Promise.all([connecting, loggingOut]);
  assert.equal(config.state.connections.size, 0);
  assert.deepEqual(requests, []);
});

test('account changes replace only the bridged wallet and preserve external connections', async () => {
  const { config, bridge, wallet, events } = fixture();
  const external = { uid: 'external', id: 'io.metamask', name: 'MetaMask' };
  const externalConnection = { connector: external, accounts: [secondAddress], chainId: 1 };
  config.setState(state => ({ ...state, connections: new Map([['external', externalConnection]]), current: 'external', status: 'connected' }));
  await bridge.sync(wallet);
  const next = fixture(secondAddress);
  await bridge.sync(next.wallet);
  assert.equal(getAccount(config).address, secondAddress);
  assert.equal(config.state.connections.size, 2);
  assert.equal(events.eventNames().length, 0);
  await bridge.sync(null);
  assert.equal(getAccount(config).connector.id, 'io.metamask');
  assert.equal(config.state.connections.size, 1);
});

test('provider errors are reported and a later connection can recover', async () => {
  const { config, bridge, wallet } = fixture();
  await assert.rejects(bridge.sync({ ...wallet, getEthereumProvider: async () => { throw new Error('Provider unavailable'); } }), /Provider unavailable/);
  await bridge.sync(wallet);
  assert.equal(getAccount(config).address, firstAddress);
  await bridge.sync(null);
});

test('an external wallet supplied by Privy keeps its external connector identity', async () => {
  const { config, bridge, wallet, events } = fixture();
  await bridge.sync({ ...wallet, walletClientType: 'metamask', meta: { id: 'io.metamask', name: 'MetaMask' } });
  assert.equal(getAccount(config).connector.id, 'io.metamask');
  assert.equal(getAccount(config).connector.type, 'privy-session');
  events.emit('disconnect');
  assert.equal(getAccount(config).status, 'disconnected');
  assert.equal(events.eventNames().length, 0);
  await bridge.sync(null);
});

test('lowercase Privy addresses become ready after wagmi checksums the connected account', async () => {
  const address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const { config, bridge, wallet } = fixture(address);
  await bridge.sync(wallet);
  const account = getAccount(config);
  assert.notEqual(account.address, address, 'fixture must exercise checksummed casing');
  assert.equal(account.isConnected && areWalletAddressesEqual(account.address, address), true);
  assert.equal(areWalletAddressesEqual(account.address, secondAddress), false);
  assert.equal(areWalletAddressesEqual(undefined, address), false);
  assert.equal(areWalletAddressesEqual(null, null), false);
  await bridge.sync(null);
});

test('restored external Privy sessions stay selected without being reported as Reown logins', async () => {
  const { config, bridge, wallet, events } = fixture();
  const externalWallet = { ...wallet, walletClientType: 'metamask', meta: { id: 'io.metamask', name: 'MetaMask' } };
  let previousConnector;
  for (let render = 0; render < 6; render++) {
    const reownAddress = getReownAddress(getAccount(config), [...config.state.connections.values()]);
    assert.equal(reownAddress, null);
    // The restored authenticated session has no explicit selection. This is
    // Session's fallback selection, using the production ownership helper.
    const activeMethod = reownAddress ? 'wallet' : 'privy';
    await bridge.sync(activeMethod === 'privy' ? externalWallet : null);
    const connector = getAccount(config).connector;
    assert.equal(connector.id, 'io.metamask', 'external funding identity is retained');
    assert.equal(connector.type, 'privy-session');
    if (previousConnector) assert.equal(connector.uid, previousConnector.uid, 'restoration must not reconnect');
    previousConnector = connector;
  }
  assert.equal(events.listenerCount('accountsChanged'), 1);
  await bridge.sync(null);
  assert.equal(getReownAddress(getAccount(config), [...config.state.connections.values()]), null);
});

test('independent Reown connections remain discoverable while an external Privy wallet is active', async () => {
  const { config, bridge, wallet } = fixture();
  const connector = { uid: 'reown', id: 'io.metamask', name: 'MetaMask', type: 'injected' };
  const connection = { connector, accounts: [secondAddress], chainId: 1 };
  config.setState(state => ({ ...state, connections: new Map([[connector.uid, connection]]), current: connector.uid, status: 'connected' }));
  assert.equal(getReownAddress(getAccount(config), [...config.state.connections.values()]), secondAddress);
  await bridge.sync({ ...wallet, walletClientType: 'metamask', meta: { id: 'io.metamask', name: 'MetaMask' } });
  assert.equal(getAccount(config).address, firstAddress);
  assert.equal(getReownAddress(getAccount(config), [...config.state.connections.values()]), secondAddress);
  await bridge.sync(null);
  assert.equal(getAccount(config).connector.uid, connector.uid);
  assert.equal(getReownAddress(getAccount(config), [...config.state.connections.values()]), secondAddress);
});
