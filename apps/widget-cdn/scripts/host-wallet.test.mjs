import assert from 'node:assert/strict';
import test from 'node:test';
import { createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { getAccount, watchAccount } from 'wagmi/actions';
import { isEmbeddedHostConnector, resolveHostWalletStatus } from '../src/hostWallet.ts';

const address = '0x1234567890123456789012345678901234567890';

test('recognizes verified embedded connector IDs, including SDK-generated suffixes', () => {
  for (const id of [
    'io.privy.wallet', `io.privy.wallet.${address}`, 'io.privy.smart_wallet',
    'dynamic-turnkey-1', 'dynamic-turnkeyhd-12', 'dynamic-dynamicwaas-3',
  ]) {
    assert.equal(isEmbeddedHostConnector({ id }), true, id);
  }
});

test('does not classify external wallets by SDK type or display name', () => {
  for (const id of [
    'io.metamask', 'walletConnect', 'injected', 'custom', 'privy',
    'dynamic-metamask-1', 'dynamic-walletconnect-2', 'dynamic',
    'io.privy.wallet.fake', 'io.privy.wallet.attacker.example', 'dynamic-turnkey-extra-1',
  ]) {
    assert.equal(isEmbeddedHostConnector({ id, name: 'Privy Dynamic', type: 'dynamic' }), false, id);
  }
  assert.equal(isEmbeddedHostConnector(undefined), false);
});

test('waits for connection restoration and ignores stale disconnected connector metadata', () => {
  const connector = { id: 'io.privy.wallet' };
  for (const status of ['connecting', 'reconnecting']) {
    assert.equal(resolveHostWalletStatus({ status, connector }), 'loading');
  }
  assert.equal(resolveHostWalletStatus({ status: 'disconnected', connector }), 'other');
  assert.equal(resolveHostWalletStatus({ status: 'connected', connector }), 'embedded');
  assert.equal(resolveHostWalletStatus({ status: 'connected', connector: { id: 'io.metamask' } }), 'other');
});

test('the shared host config reports active connection changes rather than every installed connector', () => {
  const config = createConfig({ chains: [mainnet], connectors: [], storage: null, ssr: true });
  const external = { id: 'io.metamask', uid: 'external' };
  const embedded = { id: `io.privy.wallet.${address}`, uid: 'embedded' };
  const connections = new Map([external, embedded].map(connector => [connector.uid, {
    connector, accounts: [address], chainId: 1,
  }]));
  const observed = [];
  const stop = watchAccount(config, {
    onChange: account => observed.push(resolveHostWalletStatus(account)),
  });
  try {
    config.setState(state => ({ ...state, connections, current: external.uid, status: 'connected' }));
    assert.equal(resolveHostWalletStatus(getAccount(config)), 'other');
    config.setState(state => ({ ...state, current: embedded.uid, status: 'reconnecting' }));
    config.setState(state => ({ ...state, status: 'connected' }));
    config.setState(state => ({ ...state, current: null, status: 'disconnected' }));
    assert.deepEqual(observed, ['other', 'loading', 'embedded', 'other']);
  } finally {
    stop();
  }
});
