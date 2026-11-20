import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'

// Exercise real chain construction, Wagmi initialization and connection updates
// without starting wallet SDKs or discovery requests.
const connectorsUrl = 'data:text/javascript,export const buildEVMConnectors = () => []; export const createHiddenWalletConnectConnector = () => {}'
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.includes('/adapters/evm/dist/esm/') && specifier.endsWith('/EVMProvider/Connectors')) {
            return { url: connectorsUrl, shortCircuit: true }
        }
        if (context.parentURL?.endsWith('/EVMProvider/init.js') && specifier === './Connectors') {
            return { url: connectorsUrl, shortCircuit: true }
        }
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
        }
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())

const { createEVMProvider, getEvmConfig, hasEvmConfig } = await import('../dist/esm/generic.js')
const { initEvmProvider } = await import('../dist/esm/EVMProvider/init.js')
const { createWalletProvidersRegistry } = await import('../../../core/dist/esm/lib/walletConnect/walletProvidersRegistry.js')

const networkAdapter = {
    getId: n => n.name,
    getDisplayName: n => n.name,
    getChainId: n => n.chainId,
    getRpcUrls: n => n.rpcUrls ?? [],
    getNativeCurrency: n => n.currency,
    getIcon: () => undefined,
    getTransactionExplorerUrl: () => undefined,
    isEvmNetwork: n => n.type === 'evm',
}
const ethereum = {
    name: 'ETHEREUM_MAINNET', type: 'evm', chainId: 1,
    rpcUrls: ['https://rpc.example'], currency: { symbol: 'ETH', decimals: 18 },
}

test('empty and non-EVM settings defer initialization, and updated settings recover the same connection', () => {
    const props = { networks: [], networkAdapter, walletProvidersRegistry: createWalletProvidersRegistry() }
    const connection = createEVMProvider().createConnection(props)
    try {
        assert.equal(hasEvmConfig(), false)
        assert.deepEqual(connection.store.getState().availableConnectors, [])

        connection.updateProps({ ...props, networks: [{ name: 'SOLANA_DEVNET', type: 'solana' }] })
        assert.equal(hasEvmConfig(), false)

        connection.updateProps({ ...props, networks: [{ ...ethereum, rpcUrls: [] }] })
        assert.equal(hasEvmConfig(), false)

        connection.updateProps({ ...props, networks: [ethereum] })
        assert.equal(hasEvmConfig(), true)
        assert.deepEqual(getEvmConfig().chains.map(c => c.id), [1])
        assert.deepEqual(connection.store.getState().asSourceSupportedNetworks, ['ETHEREUM_MAINNET'])

        const liveConfig = getEvmConfig()
        connection.updateProps(props)
        assert.equal(getEvmConfig(), liveConfig)
        assert.deepEqual(getEvmConfig().chains.map(c => c.id), [1])

        // A host config remains valid even when Layerswap has no chains to add.
        initEvmProvider({ ...props, externalWagmiConfig: liveConfig })
        assert.equal(getEvmConfig(), liveConfig)
    } finally {
        connection.destroy?.()
    }
})

test('custom connection stores retain their lifecycle method receiver', () => {
    class CustomConnection {
        store = {}
        updates = 0
        destroyed = false
        updateProps() { this.updates++ }
        destroy() { this.destroyed = true }
    }
    const custom = new CustomConnection()
    const props = { networks: [], networkAdapter, walletProvidersRegistry: createWalletProvidersRegistry() }
    const connection = createEVMProvider({ customConnection: () => custom }).createConnection(props)
    assert.equal(connection.store, custom.store)
    connection.updateProps(props)
    assert.equal(custom.updates, 1)
    connection.destroy()
    assert.equal(custom.destroyed, true)
})
