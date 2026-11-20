import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { createConfig, createConnector, getAccount, http } from '@wagmi/core'
import { mainnet } from 'viem/chains'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
        }
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())

const { createEVMTransferProvider } = await import('../dist/esm/transferProvider/createEVMTransferProvider.js')
const { createEVMGaslessProvider } = await import('../dist/esm/gaslessProvider/createEVMGaslessProvider.js')
const { resolveWalletConnector } = await import('../dist/esm/service/resolveWalletConnector.js')
const { resolveWallet } = await import('../dist/esm/service/resolveWallet.js')
const { setPendingMetadataForRegistry, clearPendingDynamicWcMetadata, setDynamicWcMetadata } = await import('@layerswap/wallet-core')

const address = '0x0000000000000000000000000000000000000001'
const hash = `0x${'ab'.repeat(32)}`
const signature = `0x${'cd'.repeat(65)}`

function fixture() {
    const calls = []
    const connector = (id, name) => createConnector(() => ({
        id, name, type: 'test',
        connect: async () => ({ accounts: [address], chainId: 1 }),
        disconnect: async () => {},
        getAccounts: async () => [address],
        getChainId: async () => 1,
        isAuthorized: async () => true,
        getProvider: async () => ({
            request: async ({ method }) => {
                calls.push({ name, method })
                if (method === 'eth_chainId') return '0x1'
                if (method === 'eth_sendTransaction') return hash
                if (method === 'eth_signTypedData_v4') return signature
                throw new Error(`Unexpected request ${method}`)
            },
        }),
        onAccountsChanged() {}, onChainChanged() {}, onDisconnect() {},
    }))
    const config = createConfig({
        chains: [mainnet],
        connectors: [connector('metaMaskSDK', 'MetaMask'), connector('hiddenWalletConnect', 'Hidden WalletConnect')],
        transports: { [mainnet.id]: http() },
        storage: null,
        multiInjectedProviderDiscovery: false,
    })
    const [metamask, rainbow] = config.connectors
    config.setState(state => ({
        ...state,
        current: metamask.uid,
        status: 'connected',
        connections: new Map([metamask, rainbow].map(connector => [connector.uid, { connector, accounts: [address], chainId: 1 }])),
    }))
    const wallet = {
        id: 'Rainbow', internalId: 'rainbow', address, addresses: [address],
        isActive: false, providerName: 'EVM', metadata: { evmConnectorUid: rainbow.uid },
    }
    return { config, calls, wallet, rainbow, metamask }
}

test('a Rainbow transfer uses its connector even while MetaMask is the active wagmi account', async () => {
    const { config, calls, wallet } = fixture()
    const provider = createEVMTransferProvider(config, () => true, async () => ({
        to: address, account: address, chainId: 1, value: 0n, gas: 21000n,
    }))
    assert.equal(getAccount(config).connector.name, 'MetaMask')
    assert.equal(await provider.executeTransfer({ selectedWallet: wallet }), hash)
    assert.ok(calls.some(call => call.method === 'eth_sendTransaction'))
    assert.ok(calls.every(call => call.name === 'Hidden WalletConnect'))
})

test('gasless Rainbow signatures use the selected connector with the same address in MetaMask', async () => {
    const { config, calls, wallet } = fixture()
    const provider = createEVMGaslessProvider(config, () => true)
    assert.equal(await provider.signGaslessDeposit({ address, wallet, typedData: { message: {} } }), signature)
    assert.deepEqual(calls, [{ name: 'Hidden WalletConnect', method: 'eth_signTypedData_v4' }])
})

test('a disconnected selected connector cannot fall back to MetaMask', async () => {
    const { config, calls, wallet, metamask } = fixture()
    config.setState(state => ({ ...state, connections: new Map([[metamask.uid, state.connections.get(metamask.uid)]]) }))
    assert.throws(() => resolveWalletConnector(config, wallet), /Reconnect your wallet/)
    assert.deepEqual(calls, [])
})

test('pending Rainbow metadata takes precedence over an old MetaMask record for the same address', () => {
    // Simulate a browser for the metadata store without loading a wallet SDK.
    globalThis.window = { addEventListener() {} }
    const storage = new Map()
    globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }
    try {
        setDynamicWcMetadata('eip155', address, { name: 'MetaMask', id: 'metamask', icon: '', deepLink: 'metamask://' })
        setPendingMetadataForRegistry('eip155', { name: 'Rainbow', id: 'rainbow', mobile: { native: 'rainbow://' } })
        const { rainbow } = fixture()
        const wallet = resolveWallet({
            connection: { connector: rainbow, accounts: [address], chainId: 1 },
            activeConnection: { id: rainbow.id, address },
            networks: [], networkAdapter: {}, supportedNetworks: { asSource: [], withdrawal: [], autofill: [] },
            providerName: 'EVM', disconnect() {},
        })
        assert.equal(wallet.id, 'Rainbow')
        assert.equal(wallet.metadata.deepLink, 'rainbow://')
        assert.equal(wallet.metadata.evmConnectorUid, rainbow.uid)
    } finally {
        clearPendingDynamicWcMetadata('eip155')
        delete globalThis.window
        delete globalThis.localStorage
    }
})

test('registry connection returns the hidden transport identity and retains the Rainbow signing link', async () => {
    const storage = new Map()
    globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }
    globalThis.window = { addEventListener() {}, localStorage }
    try {
        const { EvmConnectionService } = await import('../dist/esm/service/EvmConnectionService.js')
        const { provideExternalEvmConfig } = await import('../dist/esm/service/getEvmConfig.js')
        const { useEvmStore } = await import('../dist/esm/service/evmStore.js')
        const { config, rainbow } = fixture()
        provideExternalEvmConfig(config)
        useEvmStore.getState()._setConnectors(config.connectors)
        const service = new EvmConnectionService()
        service.setNetworks([], {})
        service.configure({ isMobilePlatform: true })
        const wallet = await service.connectWallet({ connector: {
            id: 'rainbow', name: 'Rainbow', source: 'registry', type: 'walletConnect',
            providerName: 'EVM', mobile: { native: 'rainbow://' },
        } })
        assert.equal(wallet.id, 'Rainbow')
        assert.equal(wallet.internalId, 'rainbow')
        assert.equal(wallet.isActive, true)
        assert.equal(wallet.metadata.evmConnectorUid, rainbow.uid)
        assert.equal(wallet.metadata.deepLink, 'rainbow://')
        assert.equal(resolveWalletConnector(config, wallet).uid, rainbow.uid)
    } finally {
        delete globalThis.window
        delete globalThis.localStorage
    }
})
