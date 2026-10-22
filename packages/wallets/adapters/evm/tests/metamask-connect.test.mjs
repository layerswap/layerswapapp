import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import test, { after } from 'node:test'
import { connect, createConfig, disconnect, getAccount, http, reconnect, switchChain } from '@wagmi/core'
import { mainnet, optimism } from 'viem/chains'

// Exercise the Wagmi 2 connector AND MetaMask Connect EVM provider. Only
// the multichain transport is replaced, so these tests need no wallet or network.
const transportModule = `data:text/javascript,${encodeURIComponent(`
    export { EventEmitter } from 'node:events';
    export const TransportType = { MWP: 'mwp', EXTENSION: 'extension' };
    export class RPCInvokeMethodErr extends Error {}
    export const isRejectionError = error => error?.code === 4001;
    export const getWalletActionAnalyticsProperties = async () => ({});
    export const getInfuraRpcUrls = () => ({});
    export const createLogger = () => () => {};
    export const enableDebug = () => {};
    export const createMultichainClient = async options => {
        const fixture = globalThis.__metamaskTransportFixture;
        fixture.initializations++;
        if (fixture.failInitialization) {
            fixture.failInitialization = false;
            throw new Error('SDK initialization failed');
        }
        fixture.options = options;
        fixture.core.options = { ...options, analytics: { enabled: false } };
        return fixture.core;
    };
`)}`
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier === '@metamask/connect-multichain' && context.parentURL?.includes('/connect-evm')) {
        return { url: transportModule, shortCircuit: true }
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
    }
    return nextResolve(specifier, context)
} })
after(() => { hooks.deregister(); delete globalThis.__metamaskTransportFixture })

const { buildEVMConnectors } = await import('../dist/esm/EVMProvider/Connectors.js')
const { ensureEvmChain } = await import('../dist/esm/service/ensureEvmChain.js')
const { confirmConnectorChain } = await import('../dist/esm/service/confirmConnectorChain.js')
const account = '0x0000000000000000000000000000000000000001'
const hash = `0x${'ab'.repeat(32)}`

function fixture({ restored = true, transportType = 'mwp', rejectSwitch = false } = {}) {
    const requests = []
    const storage = new Map([['cache_eth_chainId', JSON.stringify('0xa')]])
    const session = { sessionScopes: Object.fromEntries([1, 10].map(id => [
        `eip155:${id}`, { accounts: [`eip155:${id}:${account}`], methods: [], notifications: [] },
    ])) }
    const lifecycle = { connects: 0, disconnects: 0 }
    const core = Object.assign(new EventEmitter(), {
        version: '1.2.0', transportType, status: restored ? 'connected' : 'disconnected',
        provider: { getSession: async () => restored ? session : { sessionScopes: {} } },
        storage: { adapter: { get: async key => storage.get(key), set: async (key, value) => storage.set(key, value) } },
        async connect() {
            lifecycle.connects++
            core.status = 'connected'
            core.emit('wallet_sessionChanged', session)
        },
        async disconnect() { lifecycle.disconnects++; core.status = 'disconnected' },
        openSimpleDeeplinkIfNeeded() {},
        async invokeMethod(args) {
            requests.push(args)
            const method = args.request.method
            if (method === 'eth_accounts') return [account]
            if (method === 'wallet_switchEthereumChain') {
                if (rejectSwitch) throw Object.assign(new Error('User rejected'), { code: 4001 })
                // Deliberately NO wallet chainChanged notification.
                return null
            }
            if (method === 'eth_sendTransaction') return hash
            if (method === 'eth_signTypedData_v4') return '0xsigned'
            assert.fail(`Unexpected wallet request: ${method}`)
        },
    })
    const f = { core, requests, storage, lifecycle, initializations: 0, failInitialization: false }
    globalThis.__metamaskTransportFixture = f
    const factories = buildEVMConnectors({ name: 'Layerswap', url: 'https://layerswap.io', icons: ['https://layerswap.io/icon.png'], projectId: 'test' })
    // No setup for the other connectors: this test must not initialize WalletConnect.
    const metaMask = factories.find(factory => factory({}).id === 'metaMaskSDK')
    f.config = createConfig({
        chains: [mainnet, optimism], connectors: [metaMask], storage: null,
        multiInjectedProviderDiscovery: false, transports: { 1: http(), 10: http() },
    })
    f.connector = f.config.connectors[0]
    f.ensureChain = chain => ensureEvmChain({
        chain, account, getProvider: () => f.connector.getProvider(),
        onReady: () => confirmConnectorChain(f.connector, chain.id),
    })
    return f
}

test('fresh MetaMask connections use Connect EVM with dapp metadata and configured chains', async () => {
    const f = fixture({ restored: false })
    await connect(f.config, { connector: f.connector })
    assert.equal(getAccount(f.config).address, account)
    assert.deepEqual(f.options.dapp, { name: 'Layerswap', url: 'https://layerswap.io', iconUrl: 'https://layerswap.io/icon.png' })
    assert.deepEqual(Object.keys(f.options.api.supportedNetworks), ['eip155:1', 'eip155:10'])
    assert.equal(f.options.skipAutoAnnounce, true)
})

test('a restored mobile session selects an approved chain and sends/signs without a remote switch', async () => {
    const f = fixture()
    await reconnect(f.config)
    assert.equal(getAccount(f.config).chainId, 10)
    await f.ensureChain(mainnet)
    assert.equal(getAccount(f.config).chainId, 1)
    const provider = await f.connector.getProvider()
    assert.equal(await provider.request({ method: 'eth_sendTransaction', params: [{ from: account, to: account, value: '0x0' }] }), hash)
    assert.equal(await provider.request({ method: 'eth_signTypedData_v4', params: [account, '{}'] }), '0xsigned')
    assert.equal(f.requests.filter(x => x.request.method === 'wallet_switchEthereumChain').length, 0)
    assert.ok(f.requests.filter(x => ['eth_sendTransaction', 'eth_signTypedData_v4'].includes(x.request.method)).every(x => x.scope === 'eip155:1'))
    assert.equal(JSON.parse(f.storage.get('cache_eth_chainId')), '0x1')
})

test('extension switch acknowledgement updates readiness even without a wallet chainChanged event', async () => {
    const f = fixture({ transportType: 'extension' })
    await connect(f.config, { connector: f.connector, chainId: 10 })
    f.requests.length = 0
    await f.ensureChain(mainnet)
    assert.equal(getAccount(f.config).chainId, 1)
    assert.equal(await (await f.connector.getProvider()).request({ method: 'eth_chainId' }), '0x1')
    assert.equal(f.requests.filter(x => x.request.method === 'wallet_switchEthereumChain').length, 1)
})

test('MetaMask rejection leaves the original chain selected and never sends a transaction', async () => {
    const f = fixture({ transportType: 'extension', rejectSwitch: true })
    await reconnect(f.config)
    await assert.rejects(f.ensureChain(mainnet), { code: 4001 })
    assert.equal(getAccount(f.config).chainId, 10)
})

test('concurrent provider discovery initializes the SDK once and retries an initialization failure', async t => {
    t.mock.method(console, 'error', () => {})
    const f = fixture()
    f.failInitialization = true
    await assert.rejects(f.connector.getProvider(), /SDK initialization failed/)
    const providers = await Promise.all([f.connector.getProvider(), f.connector.getProvider(), f.connector.getProvider()])
    assert.equal(f.initializations, 2)
    assert.ok(providers.every(provider => provider === providers[0]))
})

test('reconnect with no SDK session stays disconnected without opening a wallet prompt', async () => {
    const f = fixture({ restored: false })
    await reconnect(f.config)
    assert.equal(getAccount(f.config).status, 'disconnected')
    assert.equal(f.lifecycle.connects, 0)
})

test('disconnect is a no-op before initialization and permits a new connection afterwards', async () => {
    const f = fixture({ restored: false })
    await f.connector.disconnect()
    assert.equal(f.initializations, 0)
    await connect(f.config, { connector: f.connector })
    await disconnect(f.config, { connector: f.connector })
    await f.connector.disconnect()
    assert.equal(f.lifecycle.disconnects, 1)
    assert.equal(getAccount(f.config).status, 'disconnected')
    assert.deepEqual(await f.connector.getAccounts(), [])
    await connect(f.config, { connector: f.connector })
    assert.equal(getAccount(f.config).address, account)
    assert.equal(f.initializations, 1)
})

test('SDK account and disconnect events update the host Wagmi 2 config', async () => {
    const f = fixture()
    await reconnect(f.config)
    const nextAccount = '0x0000000000000000000000000000000000000002'
    f.core.emit('metamask_accountsChanged', [nextAccount])
    assert.equal(getAccount(f.config).address, nextAccount)
    f.core.emit('metamask_accountsChanged', [])
    assert.equal(getAccount(f.config).status, 'disconnected')
})

test('host Wagmi 2 switchChain uses the same verified MetaMask provider', async () => {
    const f = fixture()
    await reconnect(f.config)
    await switchChain(f.config, { connector: f.connector, chainId: 1 })
    assert.equal(getAccount(f.config).chainId, 1)
    assert.equal(f.requests.filter(x => x.request.method === 'wallet_switchEthereumChain').length, 0)
    await assert.rejects(f.connector.switchChain({ chainId: 999999 }), { name: 'ChainNotConfiguredError' })
})
