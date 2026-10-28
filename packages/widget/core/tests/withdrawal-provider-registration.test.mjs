import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import React, { act, createElement } from 'react'
import { createStore } from 'zustand/vanilla'
import { JSDOM } from 'jsdom'
import { loadSource } from './helpers/source.mjs'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true }
for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const { createRoot } = await import('react-dom/client')
after(() => {
    dom.window.close()
    for (const key of Object.keys(globals)) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

function createRegistry() {
    const wallets = '../../../wallets/core/src/'
    const descriptors = { isWalletProviderDescriptor: provider => 'loadProvider' in provider }
    const walletContext = loadSource(`${wallets}context/WalletProvidersRegistryProvider.tsx`, {
        react: React,
        '@/types/wallet': descriptors,
        '@/lib/walletConnect/walletProvidersRegistry': loadSource(`${wallets}lib/walletConnect/walletProvidersRegistry.ts`),
        '@/lib/walletConnect/descriptorStubStore': loadSource(`${wallets}lib/walletConnect/descriptorStubStore.ts`, {
            'zustand/vanilla': { createStore },
        }),
        '@/lib/walletConnect/walletDescriptorLoader': { WalletDescriptorLoaderContext: React.createContext(null) },
    })
    const { TransferResolver } = loadSource('lib/transfers/transferResolver.ts')
    let transferResolver
    const resolverService = {
        setProviders: (_balances, _gas, _nfts, transfers) => { transferResolver = new TransferResolver(transfers) },
        getTransferResolver: () => {
            assert.ok(transferResolver, 'discovery waits for existing provider registration')
            return transferResolver
        },
    }
    const context = loadSource('context/resolverContext.tsx', {
        react: React,
        '@layerswap/wallet-core/types': descriptors,
        '@/lib/resolvers/resolverService': { resolverService },
        '@/lib/extendedRoutes': { setExtendedRouteProviders() {} },
    })
    const { useWithdrawalProvider } = loadSource('hooks/useWithdrawalProvider.ts', {
        react: React,
        '@layerswap/wallet-core': walletContext,
        '@/lib/resolvers/resolverService': { resolverService },
    })
    const root = createRoot(document.createElement('div'))
    return {
        useWithdrawalProvider,
        render: (walletProviders, children) => act(() => root.render(
            createElement(walletContext.WalletProvidersRegistryProvider, { walletProviders, networks: [], networkAdapter: {} },
                createElement(context.ResolverProviders, { walletProviders }, children)),
        )),
        unmount: () => act(() => root.unmount()),
        get transferResolver() { return transferResolver },
    }
}

test('withdrawal discovery uses existing wallet registration for lazy loading and adapter replacement', async () => {
    const registry = createRegistry()
    const network = { name: 'CUSTOM_NETWORK' }
    const withdrawal = { id: 'custom', displayName: 'Custom Venue', prepareTransfer() {} }
    const transfer = { supportsNetwork: candidate => candidate.name === network.name, withdrawal }
    const renders = []
    const descriptor = { id: 'custom', loadProvider() {} }
    const store = createStore(() => ({ id: 'custom', connectedWallets: [] }))
    const adapter = { id: 'custom', createConnection: () => ({ store }), transferProvider: () => transfer }
    function Probe() {
        renders.push(registry.useWithdrawalProvider(network))
        return null
    }
    // Keep the child unchanged so only existing registration updates notify it.
    const probe = createElement(Probe)
    try {
        await registry.render([descriptor], probe)
        assert.ok(renders.length > 0)
        assert.ok(renders.every(value => value === undefined))
        await registry.render([adapter], probe)
        assert.equal(renders.at(-1), withdrawal)
        assert.equal(registry.transferResolver.getWithdrawalProvider(network), withdrawal)

        const replacement = { ...withdrawal, displayName: 'Updated Venue' }
        await registry.render([{ ...adapter, transferProvider: () => ({ ...transfer, withdrawal: replacement }) }], probe)
        assert.equal(renders.at(-1), replacement, 'configuration updates work even when the connection store is retained')
    } finally {
        await registry.unmount()
    }
})

test('withdrawal discovery follows transfer execution precedence and handles absent networks', async () => {
    const registry = createRegistry()
    const first = { supportsNetwork: () => true, executeTransfer: async () => 'first-provider' }
    const second = { supportsNetwork: () => true, withdrawal: { id: 'later', displayName: 'Later Venue' } }
    const adapter = {
        id: 'custom', createConnection: () => ({ store: createStore(() => ({})) }),
        transferProvider: [() => first, () => second],
    }
    function Probe() {
        assert.equal(registry.useWithdrawalProvider(undefined), undefined)
        assert.equal(registry.useWithdrawalProvider({ name: 'NETWORK' }), undefined,
            'a later capability cannot select a different provider than execution')
        return null
    }
    try {
        await registry.render([adapter], createElement(Probe))
        assert.equal(await registry.transferResolver.executeTransfer({ network: { name: 'NETWORK' } }), 'first-provider')
    } finally {
        await registry.unmount()
    }
})
