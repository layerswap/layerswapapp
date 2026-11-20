import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { createConfig, createConnector, connect, http } from '@wagmi/core'
import { mainnet, optimism } from 'viem/chains'

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
    }
    return nextResolve(specifier, context)
} })
after(() => hooks.deregister())

const { EvmConnectionService } = await import('../dist/esm/service/EvmConnectionService.js')
const { provideExternalEvmConfig } = await import('../dist/esm/service/getEvmConfig.js')
const account = '0x0000000000000000000000000000000000000001'

let shared
function selectWallet(fixture, selectedId) {
    const selected = fixture.config.connectors.find(c => c.id === selectedId)
    fixture.calls.length = 0
    const wallet = { id: selectedId, internalId: selectedId, address: account, chainId: 1, metadata: { evmConnectorUid: selected.uid } }
    return { ...fixture, selected, wallet }
}

async function fixture(selectedId = 'metaMaskSDK') {
    if (shared) return selectWallet(shared, selectedId)
    const calls = []
    const makeConnector = id => createConnector(({ emitter }) => {
        let chainId = 10
        let requestedChains = [10]
        const provider = {
            async request({ method, params }) {
                calls.push({ id, method })
                if (method === 'eth_chainId') return `0x${chainId.toString(16)}`
                if (method === 'eth_accounts') return [account]
                if (method === 'wallet_switchEthereumChain') { chainId = Number(params[0].chainId); return null }
                assert.fail(`Unexpected ${method}`)
            },
        }
        return {
            id, name: id, type: 'test',
            connect: async () => ({ accounts: [account], chainId }),
            disconnect: async () => {}, isAuthorized: async () => true,
            getAccounts: async () => [account], getChainId: async () => chainId,
            getProvider: async () => provider,
            // A connector's private switch implementation is not the readiness contract.
            switchChain: () => assert.fail('must not enter SDK-specific switch confirmation'),
            onAccountsChanged() {}, onDisconnect() {},
            onChainChanged: chain => emitter.emit('change', { chainId: Number(chain) }),
            ...(id === 'hiddenWalletConnect' ? {
                getRequestedChainsIds: async () => requestedChains,
                setRequestedChainsIds: ids => { requestedChains = ids },
            } : {}),
        }
    })
    const config = createConfig({
        chains: [mainnet, optimism], connectors: [makeConnector('metaMaskSDK'), makeConnector('hiddenWalletConnect')],
        transports: { 1: http(), 10: http() }, storage: null, multiInjectedProviderDiscovery: false,
    })
    for (const connector of config.connectors) await connect(config, { connector })
    provideExternalEvmConfig(config)
    // Snapshot deliberately claims Ethereum while the selected provider is on Optimism.
    shared = { config, calls, service: new EvmConnectionService() }
    return selectWallet(shared, selectedId)
}

for (const id of ['metaMaskSDK', 'hiddenWalletConnect']) {
    test(`${id} readiness uses the selected provider and synchronizes wagmi without provider events`, async () => {
        const f = await fixture(id)
        await f.service.ensureChain(f.wallet, 1)
        assert.ok(f.calls.every(call => call.id === id))
        assert.equal(f.calls.filter(call => call.method === 'wallet_switchEthereumChain').length, 1)
        assert.equal(f.config.state.connections.get(f.selected.uid).chainId, 1)
        if (id === 'hiddenWalletConnect') assert.deepEqual(await f.selected.getRequestedChainsIds(), [10, 1])
        await f.service.ensureChain(f.wallet, 1)
        assert.equal(f.calls.filter(call => call.method === 'wallet_switchEthereumChain').length, 1)
    })
}

test('a disconnected selected wallet never falls back to another connected wallet with the same address', async () => {
    const f = await fixture()
    f.config.setState(state => {
        const connections = new Map(state.connections)
        connections.delete(f.selected.uid)
        return { ...state, connections }
    })
    await assert.rejects(f.service.ensureChain(f.wallet, 1), /Reconnect your wallet/)
    assert.deepEqual(f.calls, [])
})
