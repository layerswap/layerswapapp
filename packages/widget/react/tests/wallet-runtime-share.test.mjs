import assert from 'node:assert/strict';
import test from 'node:test';
import { createWalletRuntimeShare, assertRemoteWalletRuntime, assertWalletConfig } from '../dist/esm/walletRuntimeShare.js';

function fixture() {
  const createConfig = () => { throw new Error('Sharing must never create another config'); };
  return {
    wagmi: { createConfig }, core: { createConfig }, viem: {}, query: {},
    versions: { wagmi: '2.14.11', core: '2.16.4', viem: '2.38.0', query: '5.90.11' },
  };
}

test('sharing preserves actual module identities without creating configs', () => {
  const input = fixture();
  const shares = createWalletRuntimeShare(input);
  for (const [name, key] of [['wagmi', 'wagmi'], ['@wagmi/core', 'core'], ['viem', 'viem'], ['@tanstack/react-query', 'query']]) {
    assert.equal(shares[name].lib(), input[key]);
    assert.equal(shares[name].loaded, true);
    assert.equal(shares[name].strictVersion, true);
  }
});

test('latest tested wagmi/core versions are accepted', () => {
  const input = fixture();
  input.versions.wagmi = '2.19.5'; input.versions.core = '2.22.1';
  assert.doesNotThrow(() => createWalletRuntimeShare(input));
});

for (const [name, version] of [['wagmi', '2.14.10'], ['wagmi', '3.0.0'], ['wagmi', '2.20.0-beta.1'], ['viem', '2.31.0'], ['viem', '3.0.0'], ['core', '3.0.0']]) {
  test(`rejects incompatible ${name} ${version} before loading the remote`, () => {
    const input = fixture(); input.versions[name] = version;
    assert.throws(() => createWalletRuntimeShare(input), /Unsupported/);
  });
}

test('rejects two core instances even when their versions match', () => {
  const input = fixture(); input.core = { createConfig() {} };
  assert.throws(() => createWalletRuntimeShare(input), /Multiple @wagmi\/core instances detected/);
});

test('capability handshake checks functions from every host wallet module', () => {
  const input = fixture();
  input.wagmi.useConfig = () => {};
  input.viem = { createPublicClient() {} };
  input.query = { QueryClient: class {} };
  const shared = createWalletRuntimeShare(input);
  const probe = {
    wagmiCreateConfig: input.wagmi.createConfig, wagmiUseConfig: input.wagmi.useConfig,
    coreCreateConfig: input.core.createConfig, viemCreatePublicClient: input.viem.createPublicClient,
    queryClient: input.query.QueryClient,
  };
  assert.doesNotThrow(() => assertRemoteWalletRuntime(probe, shared));
  for (const name of Object.keys(probe)) {
    assert.throws(() => assertRemoteWalletRuntime({ ...probe, [name]: () => {} }, shared), /different wallet runtime/);
  }
  assert.throws(() => assertRemoteWalletRuntime({}, shared), /different wallet runtime/);
});

test('wallet config validation rejects late additions, removal and replacement', () => {
  const config = {};
  assert.doesNotThrow(() => assertWalletConfig(undefined, false, undefined));
  assert.doesNotThrow(() => assertWalletConfig(config, true, config));
  assert.throws(() => assertWalletConfig(config, false, undefined), /Import the widget/);
  assert.throws(() => assertWalletConfig(undefined, true, config), /requires the existing host/);
  assert.throws(() => assertWalletConfig({}, true, config), /Keep wagmiConfig stable/);
});
