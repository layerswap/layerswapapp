import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement, StrictMode } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const react = JSON.stringify(import.meta.resolve('react'))
const data = source => ({ url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true })
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes('/ui-kit/dist/esm/')) {
        if (specifier === '@layerswap/wallet-core') return data(`
            import { useState } from ${react};
            export const usePersistedState = initial => useState(initial);
            export const useWalletProviderReadiness = () => globalThis.__ecosystemFixture.readiness;
            export const useConnectors = () => ({ initialConnectors: [] });
            export const useConnectorSourcesStatus = () => ({ blockListWhileLoading: false });
            export const normalizeIconSrc = source => source;
        `)
        if (specifier.endsWith('/WalletModalProvider')) return data('export const useConnectModal = () => globalThis.__ecosystemFixture.modal')
        if (specifier.endsWith('/useAdditionalConnectors')) return data('export const useAdditionalConnectors = () => ({ isSearching: false })')
        for (const name of ['ConnectorsBrowser', 'InstalledExtensionNotFound', 'LoadingConnect', 'WalletQrCode']) {
            if (specifier.endsWith(`/${name}`)) return data(`import { createElement } from ${react}; export const ${name} = () => createElement('div', null, '${name}');`)
        }
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        const file = `${specifier}.js`
        return nextResolve(existsSync(new URL(file, context.parentURL)) ? file : `${specifier}/index.js`, context)
    }
    return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const { ConnectorsList } = await import('../../../ui-kit/dist/esm/components/ConnectorsList.js')
const { useFeaturedProviders } = await import('../../../ui-kit/dist/esm/components/connectors-list/useFeaturedProviders.js')
const { useWalletConnection } = await import('../../../ui-kit/dist/esm/components/connectors-list/useWalletConnection.js')
const { DepositStepProvider, useDepositStep } = await import('../dist/esm/components/Pages/Deposit/depositStepContext.js')
const { WalletProvidersRegistryProvider } = await import('../../../wallets/core/dist/esm/context/WalletProvidersRegistryProvider.js')
let root, container, connection, featured, calls, finished, fixture
const evm = { id: 'evm', name: 'EVM', ready: true, connectWallet: async () => { calls.push('evm'); return { id: 'MetaMask' } } }
const svm = { id: 'svm', name: 'Solana', ready: true, connectWallet: async () => { calls.push('svm'); return { id: 'Phantom' } } }
const variants = [{ id: 'evm-phantom', name: 'Phantom', providerName: 'EVM' }, { id: 'svm-phantom', name: 'Phantom', providerName: 'Solana' }]
function Probe({ providers }) {
    const result = useFeaturedProviders({ providers, selectedProvider: fixture.modal.selectedProvider, setSelectedProvider() {} })
    featured = result.featuredProviders
    connection = useWalletConnection({ featuredProviders: featured, onFinish: wallet => finished.push(wallet) })
    return null
}
const render = (component, props) => act(() => root.render(createElement(component, props)))
beforeEach(() => {
    calls = []; finished = []
    fixture = {
        modal: { setSelectedConnector() {}, setSelectedMultiChainConnector() {}, setSelectedProvider() {} },
        readiness: { areSourcesStillLoading: () => false, getLiveVariants: () => variants, awaitProvidersSettled: async () => {}, awaitLiveProvider: async () => svm },
    }
    globalThis.__ecosystemFixture = fixture
    container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); delete globalThis.__ecosystemFixture })
after(() => {
    hooks.deregister(); dom.window.close()
    for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

test('a stale selected EVM provider is excluded and cannot reconnect while non-EVM wallets can', async () => {
    for (const isSelectedFromFilter of [false, true]) {
        fixture.modal.selectedProvider = { ...evm, isSelectedFromFilter }
        await render(Probe, { providers: [{ ...evm, connectionDisabled: true }, svm] })
        assert.deepEqual(featured.map(provider => provider.id), ['svm'])
        await act(() => connection.connect({ id: 'metamask', name: 'MetaMask' }, evm))
        assert.deepEqual(calls, [])
        assert.match(connection.connectionError, /ecosystem is not available/)
    }
    await act(() => connection.connect(variants[1], svm))
    assert.deepEqual(calls, ['svm'])
    assert.deepEqual(finished, [{ id: 'Phantom' }])
})

test('a provider removed while hydration is pending cannot connect when that wait resolves', async () => {
    let resolveProvider
    fixture.readiness.awaitLiveProvider = () => new Promise(resolve => { resolveProvider = resolve })
    const stub = { ...svm, isStub: true, ready: false }
    await render(Probe, { providers: [stub] })
    let pending
    await act(async () => { pending = connection.connect(variants[1], stub) })
    await render(Probe, { providers: [] })
    await act(async () => { resolveProvider(svm); await pending })
    assert.deepEqual(calls, [])
    assert.match(connection.connectionError, /ecosystem is not available/)
})

test('multi-chain wallets show their non-EVM variant and remove cached EVM choices', async () => {
    fixture.modal.selectedMultiChainConnector = { id: 'phantom', name: 'Phantom', isMultiChain: true, providerName: 'EVM', variants }
    await render(ConnectorsList, { providers: [{ ...evm, connectionDisabled: true }, svm], onFinish: wallet => finished.push(wallet) })
    const buttons = [...container.querySelectorAll('button')]
    assert.deepEqual(buttons.map(button => button.textContent.trim()), ['Solana'])
    await act(async () => { buttons[0].click(); await Promise.resolve() })
    assert.deepEqual(calls, ['svm'])
})

test('a stale EVM QR selection cannot revive the excluded connector view', async () => {
    fixture.modal.selectedProvider = evm
    fixture.modal.selectedConnector = { id: 'walletConnect', name: 'WalletConnect', providerName: 'EVM', showQrCode: true, qr: { state: 'fetched', value: 'test' } }
    await render(ConnectorsList, { providers: [{ ...evm, connectionDisabled: true }, svm], onFinish() {} })
    assert.equal(container.textContent, 'ConnectorsBrowser')
    assert.deepEqual(calls, [])
})

for (const outcome of ['approval', 'rejection']) {
    test(`a late ${outcome} cannot revive EVM funding after the host policy unmounts its connection screen`, async () => {
        let approve, reject, navigation
        const provider = { ...evm, connectWallet: () => new Promise((resolve, fail) => { approve = resolve; reject = fail }) }
        const modalWrites = []
        fixture.modal.setSelectedConnector = value => modalWrites.push(value)
        function ConnectView() {
            const { push } = useDepositStep()
            connection = useWalletConnection({ featuredProviders: [provider], onFinish: wallet => { finished.push(wallet); push('wallet-source') } })
            return 'Waiting for approval'
        }
        function Router() {
            navigation = useDepositStep()
            return navigation.step === 'wallet-connect' ? createElement(ConnectView) : navigation.step
        }
        const configuredProviders = [{ id: 'evm', loadProvider: async () => { throw new Error('SDK must stay lazy') } }]
        function Host({ status }) {
            return createElement(WalletProvidersRegistryProvider, { walletProviders: configuredProviders, networks: [], networkAdapter: {} },
                createElement(DepositStepProvider, { hostWalletStatus: status }, createElement(Router)))
        }
        await render(Host, { status: 'other' })
        await act(() => navigation.push('wallet-connect'))
        let pending
        await act(async () => { pending = connection.connect({ id: 'metamask', name: 'MetaMask' }, provider) })
        await render(Host, { status: 'embedded' })
        assert.equal(navigation.step, 'method-picker')
        assert.equal(navigation.embeddedHostWallet, true)
        const writesBeforeResult = modalWrites.length
        await act(async () => {
            if (outcome === 'approval') approve({ id: 'MetaMask', providerName: 'EVM' })
            else reject(new Error('Delayed rejection'))
            await pending
        })
        assert.equal(navigation.step, 'method-picker')
        assert.deepEqual(finished, [])
        assert.equal(modalWrites.length, writesBeforeResult, 'the old result must not update another screen')
    })
}

test('an approval is ignored when its provider is disabled while the hook stays mounted', async () => {
    let approve
    const provider = { ...svm, connectWallet: () => new Promise(resolve => { approve = resolve }) }
    await render(Probe, { providers: [provider] })
    let pending
    await act(async () => { pending = connection.connect(variants[1], provider) })
    await render(Probe, { providers: [{ ...provider, connectionDisabled: true }] })
    await act(async () => { approve({ id: 'Phantom' }); await pending })
    assert.deepEqual(finished, [])
})

test('a current deferred approval still completes once under StrictMode', async () => {
    let approve
    const provider = { ...svm, connectWallet: () => new Promise(resolve => { approve = resolve }) }
    await act(() => root.render(createElement(StrictMode, null, createElement(Probe, { providers: [provider] }))))
    let pending
    await act(async () => { pending = connection.connect(variants[1], provider) })
    await act(async () => { approve({ id: 'Phantom' }); await pending })
    assert.deepEqual(finished, [{ id: 'Phantom' }])
})
