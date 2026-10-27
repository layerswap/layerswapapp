import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { connect, createConfig, createConnector, getConnections, http } from '@wagmi/core'
import { mainnet } from 'viem/chains'
import { isFundingConnector } from '../../../../../apps/widget-cdn/src/hostWallet.ts'

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        try { return nextResolve(`${specifier}.js`, context) } catch { return nextResolve(`${specifier}/index.js`, context) }
    }
    return nextResolve(specifier, context)
} })
const { EvmConnectionService } = await import('../dist/esm/service/EvmConnectionService.js')
const { createEvmConnection } = await import('../dist/esm/service/createEvmConnection.js')
const { provideExternalEvmConfig } = await import('../dist/esm/service/getEvmConfig.js')
const { attachWagmiSync } = await import('../dist/esm/service/syncWagmi.js')
const address = '0x1234567890123456789012345678901234567890'
const embeddedIds = ['io.privy.wallet', `io.privy.wallet.${address}`, 'io.privy.smart_wallet', 'dynamic-turnkey-1', 'dynamic-turnkeyhd-12', 'dynamic-dynamicwaas-3']
const externalIds = ['io.metamask', 'dynamic-metamask-1']
const calls = []
const connector = id => createConnector(() => ({
    id, name: id, type: 'test',
    async connect() { calls.push(['connect', id]); return { accounts: [address], chainId: 1 } },
    async disconnect() { calls.push(['disconnect', id]) },
    getAccounts: async () => [address], getChainId: async () => 1,
    onAccountsChanged() {}, onChainChanged() {}, onDisconnect() {},
}))
const config = createConfig({ chains: [mainnet], connectors: [...externalIds, ...embeddedIds].map(connector), transports: { 1: http() }, storage: null, ssr: true, multiInjectedProviderDiscovery: false })
for (const connector of config.connectors) await connect(config, { connector })
provideExternalEvmConfig(config)
const stopSync = attachWagmiSync(config)
after(() => { stopSync(); hooks.deregister() })

test('deposit provider hides embedded connectors and existing login accounts without changing the host or peer providers', () => {
    const restricted = createEvmConnection({ networks: [], networkAdapter: {} }, { connectorFilter: isFundingConnector })
    const unrestricted = createEvmConnection({ networks: [], networkAdapter: {} })
    try {
        const snapshot = restricted.store.getState()
        assert.deepEqual(snapshot.availableConnectors.map(c => c.id).sort(), externalIds.toSorted())
        assert.deepEqual(snapshot.connectedWallets.map(w => w.metadata.connectorId).sort(), externalIds.toSorted())
        assert.equal(snapshot.activeWallet, undefined, 'the active login must not be a funding account')
        assert.equal(config.state.connections.size, embeddedIds.length + externalIds.length)
        assert.equal(unrestricted.store.getState().connectedWallets.length, embeddedIds.length + externalIds.length)
    } finally { restricted.destroy(); unrestricted.destroy() }
})

test('stale and direct embedded connection attempts are rejected before any provider action', async () => {
    const service = new EvmConnectionService()
    service.configure({ connectorFilter: isFundingConnector })
    calls.length = 0
    for (const id of embeddedIds) {
        await assert.rejects(service.connectWallet({ connector: { id, name: id, type: 'other' } }), /login wallet cannot be used/)
    }
    assert.deepEqual(calls, [], 'blocked attempts must neither disconnect nor reconnect the login')
    assert.equal(config.state.connections.size, embeddedIds.length + externalIds.length)
})

test('external funding can connect and disconnect without removing embedded login connections', async () => {
    const service = new EvmConnectionService()
    service.setNetworks([], {})
    service.configure({ connectorFilter: isFundingConnector })
    calls.length = 0
    const wallet = await service.connectWallet({ connector: { id: 'io.metamask', name: 'MetaMask', type: 'injected' } })
    assert.equal(wallet.metadata.connectorId, 'io.metamask')
    assert.ok(calls.some(([action, id]) => action === 'connect' && id === 'io.metamask'))
    assert.ok(calls.every(([, id]) => !embeddedIds.includes(id)))
    assert.equal(getConnections(config).filter(c => embeddedIds.includes(c.connector.id)).length, embeddedIds.length)
    await service.disconnectWallets()
    assert.deepEqual(getConnections(config).map(c => c.connector.id).sort(), embeddedIds.toSorted())
    assert.ok(calls.every(([, id]) => !embeddedIds.includes(id)))
})
