import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { connect, createConfig, createConnector, getConnections, http } from '@wagmi/core'
import { mainnet } from 'viem/chains'
import { isEvmFundingAllowed } from '../../../../../apps/widget-cdn/src/hostWallet.ts'

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
    }
    return nextResolve(specifier, context)
} })
const { createEvmConnection } = await import('../dist/esm/service/createEvmConnection.js')
const { provideExternalEvmConfig } = await import('../dist/esm/service/getEvmConfig.js')
const { attachWagmiSync } = await import('../dist/esm/service/syncWagmi.js')
const address = '0x1234567890123456789012345678901234567890'
const ids = ['io.metamask', 'walletConnect', 'dynamic-metamask-1', 'io.privy.wallet', `io.privy.wallet.${address}`, 'io.privy.smart_wallet', 'dynamic-turnkey-1']
const calls = []
const connector = id => createConnector(() => ({
    id, name: id, type: 'test',
    async connect() { calls.push(['connect', id]); return { accounts: [address], chainId: 1 } },
    async disconnect() { calls.push(['disconnect', id]) },
    getAccounts: async () => [address], getChainId: async () => 1,
    onAccountsChanged() {}, onChainChanged() {}, onDisconnect() {},
}))
const config = createConfig({ chains: [mainnet], connectors: ids.map(connector), transports: { 1: http() }, storage: null, ssr: true, multiInjectedProviderDiscovery: false })
await connect(config, { connector: config.connectors.find(c => c.id === 'io.privy.wallet') })
provideExternalEvmConfig(config)
const stopSync = attachWagmiSync(config)
const connection = createEvmConnection({ networks: [], networkAdapter: {} }, {
    canConnect: () => isEvmFundingAllowed(getConnections(config)),
})
after(() => { connection.destroy(); stopSync(); hooks.deregister() })

test('every EVM connector is blocked while the embedded EVM login remains connected', async () => {
    assert.equal(connection.store.getState().connectionDisabled, true)
    calls.length = 0
    // Capture the actual provider action, as a stale modal or retry would.
    const staleConnect = connection.store.getState().connectWallet
    for (const id of ids) {
        await assert.rejects(staleConnect({ connector: { id, name: id, type: 'other' } }), /EVM wallets cannot fund/)
    }
    assert.deepEqual(calls, [], 'no EVM provider may be disconnected or prompted')
    assert.deepEqual(getConnections(config).map(c => c.connector.id), ['io.privy.wallet'])
})

test('the guard observes the live login state rather than capturing a previous connector classification', async () => {
    const staleConnect = connection.store.getState().connectWallet
    config.setState(state => ({ ...state, connections: new Map(), current: null, status: 'disconnected' }))
    assert.equal(connection.store.getState().connectionDisabled, false)
    calls.length = 0
    const wallet = await staleConnect({ connector: { id: 'io.metamask', name: 'MetaMask', type: 'injected' } })
    assert.equal(wallet.metadata.connectorId, 'io.metamask')
    assert.ok(calls.some(([action, id]) => action === 'connect' && id === 'io.metamask'))
    // A new login must block the same previously captured funding action.
    await connect(config, { connector: config.connectors.find(c => c.id === 'dynamic-turnkey-1') })
    assert.equal(connection.store.getState().connectionDisabled, true)
    calls.length = 0
    await assert.rejects(staleConnect({ connector: { id: 'walletConnect', name: 'WalletConnect', type: 'other' } }), /EVM wallets cannot fund/)
    assert.deepEqual(calls, [])
})
