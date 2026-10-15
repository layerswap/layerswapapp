import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { createConfig, createConnector } from 'wagmi'
import { connect, disconnect, getAccount, switchChain } from '@wagmi/core'
import { custom } from 'viem'
import { mainnet, base } from 'viem/chains'

const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
            try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
        }
        return nextResolve(specifier, context)
    },
})
after(() => hooks.deregister())

const { initEvmProvider } = await import('../dist/esm/EVMProvider/init.js')
const { getEvmConfig, provideExternalEvmConfig } = await import('../dist/esm/service/getEvmConfig.js')
const { attachWagmiSync } = await import('../dist/esm/service/syncWagmi.js')
const { useEvmStore } = await import('../dist/esm/service/evmStore.js')
const { createEVMTransferProvider } = await import('../dist/esm/transferProvider/createEVMTransferProvider.js')
const { createEVMGaslessProvider } = await import('../dist/esm/gaslessProvider/createEVMGaslessProvider.js')

const address = '0x0000000000000000000000000000000000000001'
const secondAddress = '0x0000000000000000000000000000000000000002'
const hash = `0x${'ab'.repeat(32)}`
const signature = `0x${'cd'.repeat(65)}`
const networkAdapter = {
    getId: chain => chain.name,
    getChainId: chain => chain.id,
    getDisplayName: chain => chain.name,
    getRpcUrls: chain => chain.rpcUrls.default.http,
    getNativeCurrency: chain => chain.nativeCurrency,
    getTransactionExplorerUrl: () => undefined,
    isEvmNetwork: () => true,
}

test('host wagmi config preserves transports and synchronizes connect, chain, signing, transfer, accounts and disconnect', async () => {
    let chainId = mainnet.id
    const methods = []
    const provider = { async request({ method }) {
        methods.push(method)
        if (method === 'eth_chainId') return `0x${chainId.toString(16)}`
        if (method === 'eth_sendTransaction') return hash
        if (method === 'eth_signTypedData_v4') return signature
        throw new Error(`Unexpected wallet request: ${method}`)
    } }
    const connector = createConnector(config => ({
        id: 'compatibility', name: 'Compatibility Wallet', type: 'test',
        connect: async () => ({ accounts: [address], chainId }),
        disconnect: async () => {},
        getAccounts: async () => [address],
        getChainId: async () => chainId,
        isAuthorized: async () => true,
        getProvider: async () => provider,
        switchChain: async ({ chainId: next }) => {
            chainId = next
            config.emitter.emit('change', { chainId })
            return config.chains.find(chain => chain.id === next)
        },
        onAccountsChanged() {}, onChainChanged() {}, onDisconnect() {},
    }))
    const hostTransport = custom({ request: async () => { throw new Error('No real RPC requests allowed') } })
    const config = createConfig({
        chains: [mainnet], connectors: [connector], transports: { [mainnet.id]: hostTransport },
        storage: null, multiInjectedProviderDiscovery: false,
    })
    initEvmProvider({ externalWagmiConfig: config, networks: [mainnet, base], networkAdapter })
    const dispose = attachWagmiSync(config)
    try {
        assert.equal(getEvmConfig(), config)
        const competing = createConfig({ chains: [mainnet], transports: { [mainnet.id]: hostTransport }, storage: null })
        assert.throws(() => provideExternalEvmConfig(competing), /different wagmi config is already active/)
        assert.equal(getEvmConfig(), config)
        assert.deepEqual(config.chains.map(chain => chain.id), [mainnet.id, base.id])
        assert.equal(config._internal.transports[mainnet.id], hostTransport)
        assert.equal(config.getClient({ chainId: base.id }).chain.id, base.id)
        // Reinitializing must neither duplicate chains nor replace host transports.
        initEvmProvider({ externalWagmiConfig: config, networks: [mainnet, base], networkAdapter })
        assert.deepEqual(config.chains.map(chain => chain.id), [mainnet.id, base.id])

        await connect(config, { connector: config.connectors[0] })
        assert.equal(useEvmStore.getState().wagmiAccount.address, address)
        await switchChain(config, { chainId: base.id })
        assert.equal(getAccount(config).chainId, base.id)
        assert.equal(useEvmStore.getState().wagmiAccount.chainId, base.id)
        const wallet = {
            id: 'Compatibility Wallet', address, addresses: [address], isActive: true,
            metadata: { evmConnectorUid: config.connectors[0].uid },
        }
        const transfer = createEVMTransferProvider(config, () => true, async () => ({
            to: secondAddress, account: address, chainId: base.id, value: 0n, gas: 21000n,
        }))
        assert.equal(await transfer.executeTransfer({ selectedWallet: wallet }), hash)
        const gasless = createEVMGaslessProvider(config, () => true)
        assert.equal(await gasless.signGaslessDeposit({ address, wallet, typedData: { message: {} } }), signature)
        assert.ok(methods.includes('eth_sendTransaction'))
        assert.ok(methods.includes('eth_signTypedData_v4'))

        config.connectors[0].emitter.emit('change', { accounts: [secondAddress] })
        assert.equal(useEvmStore.getState().wagmiAccount.address, secondAddress)
        await disconnect(config)
        assert.equal(useEvmStore.getState().wagmiAccount.status, 'disconnected')
    } finally {
        dispose()
    }
})
