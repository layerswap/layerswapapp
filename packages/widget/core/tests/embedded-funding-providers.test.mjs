import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'
import { createStore } from 'zustand/vanilla'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const networks = [{ name: 'ETHEREUM_MAINNET' }, { name: 'SOLANA_MAINNET' }]
globalThis.__fundingNetworks = networks
const mocks = new Map([
    ['/context/settings', 'export const useSettingsState = () => ({ networks: globalThis.__fundingNetworks })'],
    ['/lib/address/Address', 'export class Address { static equals(a, b) { return a === b } toShortString() { return "wallet" } }'],
    ['/stores/balanceStore', 'export const getKey = () => "unused"; export const useBalanceStore = () => undefined'],
    ['/stores/manualDestAddressesStore', 'const state = { manualDestAddresses: [], addManualDestAddress() {} }; export const useManualDestAddressesStore = select => select(state)'],
])
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith('/Options/MethodPicker.js')) {
        const pickerMocks = new Map([
            ['/depositSelectionContext', 'export const useDepositSelection = () => globalThis.__depositSelection'],
            ['/DestinationTokenPicker', 'export default () => null'],
            ['/useExtendedDepositOption', 'export const useExtendedDepositOption = id => ({ present: true, available: true, networkName: id, network: { display_name: id } })'],
            ['/Icons/ConnectorIcons', 'export const ResolveConnectorIcon = () => null'],
            ['@layerswap/ui-kit/components', 'export const WalletIcon = () => null; export const ImageWithFallback = () => null'],
        ])
        for (const [suffix, source] of pickerMocks) {
            if (specifier.endsWith(suffix)) return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true }
        }
    }
    if (context.parentURL?.includes('/dist/esm/')) {
        for (const [suffix, source] of mocks) {
            if (specifier.endsWith(suffix)) return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true }
        }
        if (specifier.startsWith('.') && !extname(specifier)) {
            const file = `${specifier}.js`
            return nextResolve(existsSync(new URL(file, context.parentURL)) ? file : `${specifier}/index.js`, context)
        }
    }
    return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const { WalletProvidersRegistryProvider } = await import('../../../wallets/core/dist/esm/context/WalletProvidersRegistryProvider.js')
const { useConnectors } = await import('../../../wallets/core/dist/esm/hooks/useConnectors.js')
const { DepositStepProvider, useDepositStep } = await import('../dist/esm/components/Pages/Deposit/depositStepContext.js')
const { DepositSettingsProvider } = await import('../dist/esm/context/depositSettings.js')
const { SwapAccountsProvider, useSwapAccounts } = await import('../dist/esm/context/swapAccounts.js')
const { default: useWallet } = await import('../dist/esm/hooks/useWallet.js')
const { default: MethodPicker } = await import('../dist/esm/components/Pages/Deposit/Options/MethodPicker.js')
const wallet = (id, providerName, network) => ({ id, internalId: id, address: id, addresses: [id], providerName, autofillSupportedNetworks: [network], withdrawalSupportedNetworks: [network], asSourceSupportedNetworks: [network] })
const evmWallets = [wallet('Privy', 'EVM', networks[0].name), wallet('MetaMask', 'EVM', networks[0].name)]
const solanaWallet = wallet('Phantom', 'Solana', networks[1].name)
const makeProvider = (id, name, connectedWallets, network) => ({
    id,
    createConnection: () => ({ store: createStore(() => ({
        id, name, connectedWallets, activeWallet: connectedWallets.at(-1), ready: true,
        connectWallet: async () => connectedWallets[0],
        autofillSupportedNetworks: [network], withdrawalSupportedNetworks: [network], asSourceSupportedNetworks: [network],
    })) }),
})
const providers = [makeProvider('evm', 'EVM', evmWallets, networks[0].name), makeProvider('svm', 'Solana', [solanaWallet], networks[1].name)]
let root, container, navigation, funding, accounts, peerAccounts, connectors
const staleSearchResults = [
    { id: 'evm-phantom', name: 'Phantom', type: 'injected', providerName: 'EVM' },
    { id: 'svm-phantom', name: 'Phantom', type: 'injected', providerName: 'Solana' },
]
function Peer() { peerAccounts = useSwapAccounts('from'); return null }
function Probe() {
    funding = useWallet(); accounts = useSwapAccounts('from')
    connectors = useConnectors({ featuredProviders: funding.providers, filteredProviders: funding.providers, recentConnectors: [], searchValue: 'phantom', searchResults: staleSearchResults })
    return navigation.step === 'method-picker' ? createElement(MethodPicker) : null
}
function Session({ methods }) {
    navigation = useDepositStep()
    return createElement(DepositSettingsProvider, { value: { methods, embeddedHostWallet: navigation.embeddedHostWallet } },
        createElement(SwapAccountsProvider, null, createElement(Probe)))
}
const render = (status, walletProviders = providers, methods) => act(() => root.render(createElement(WalletProvidersRegistryProvider, { walletProviders, networks, networkAdapter: {} },
    createElement(SwapAccountsProvider, null, createElement(Peer),
        createElement(DepositStepProvider, { hostWalletStatus: status }, createElement(Session, { methods }))))))
const buttons = () => [...container.querySelectorAll('button')]
const titles = () => buttons().map(button => button.querySelector('.font-semibold').textContent)
beforeEach(() => {
    globalThis.__depositSelection = { destination: networks[0], destinationToken: { symbol: 'USDC' } }
    container = document.createElement('div'); document.body.append(container); root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); delete globalThis.__depositSelection })
after(() => {
    hooks.deregister(); dom.window.close(); delete globalThis.__fundingNetworks
    for (const key of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

test('embedded EVM logins hide the entire EVM provider and every EVM funding account', async () => {
    await render('embedded')
    assert.deepEqual(titles(), ['Deposit address', 'More wallets'])
    assert.deepEqual(funding.providers.map(provider => provider.id), ['svm'])
    assert.deepEqual(funding.wallets.map(wallet => wallet.id), ['Phantom'])
    assert.deepEqual(accounts.map(account => account.provider.id), ['svm'])
    assert.deepEqual(connectors.initialConnectors.map(connector => connector.providerName), ['Solana'])
    assert.deepEqual(connectors.initialConnectors[0].variants.map(variant => variant.providerName), ['Solana'])
    assert.deepEqual(peerAccounts.map(account => account.provider.id), ['evm', 'svm'], 'host/peer accounts remain intact')
    assert.equal(funding.getProvider(networks[0], 'withdrawal'), undefined)
    assert.equal(funding.getProvider(networks[1], 'withdrawal').id, 'svm')
    await render('other', providers, ['wallet', 'deposit_address'])
    assert.deepEqual(titles(), ['Wallet transfer', 'Deposit address', 'More wallets'])
    assert.deepEqual(funding.providers.map(provider => provider.id), ['evm', 'svm'])
    assert.deepEqual(accounts.map(account => account.provider.id), ['evm', 'svm'])
})

test('a host login change preserves an existing transfer and applies the EVM exclusion after cancellation', async () => {
    await render('other')
    await act(() => navigation.push('wallet-processing'))
    await render('embedded')
    assert.equal(navigation.step, 'wallet-processing')
    assert.deepEqual(funding.providers.map(provider => provider.id), ['evm', 'svm'])
    assert.deepEqual(accounts.map(account => account.provider.id), ['evm', 'svm'])
    await act(() => navigation.back())
    assert.equal(navigation.step, 'method-picker')
    assert.deepEqual(funding.providers.map(provider => provider.id), ['svm'])
    assert.deepEqual(accounts.map(account => account.provider.id), ['svm'])
})

test('embedded choices override host methods, require a destination and navigate back to the picker', async () => {
    for (const methods of [undefined, [], ['wallet', 'hyperliquid', 'polymarket']]) {
        await render('embedded', providers, methods)
        assert.deepEqual(titles(), ['Deposit address', 'More wallets'])
        await act(() => buttons()[1].click())
        assert.equal(navigation.step, 'wallet-connect')
        await render('loading', providers, methods)
        assert.equal(navigation.step, 'wallet-connect', 'reconnection must preserve the pending chooser')
        assert.deepEqual(funding.providers.map(provider => provider.id), ['svm'])
        await render('embedded', providers, methods)
        await act(() => navigation.back())
        await act(() => buttons()[0].click())
        assert.equal(navigation.step, 'transfer-crypto')
        await act(() => navigation.back())
        assert.equal(navigation.step, 'method-picker')
        assert.equal(navigation.canGoBack, false)
    }
    globalThis.__depositSelection.destinationToken = undefined
    await render('embedded')
    assert.ok(buttons().every(button => button.disabled))
    globalThis.__depositSelection.destinationToken = { symbol: 'USDT' }
    await render('embedded')
    assert.ok(buttons().every(button => !button.disabled))
})

test('an EVM-only configuration hides More wallets after the EVM provider is excluded', async () => {
    await render('other', [providers[0]])
    assert.deepEqual(funding.providers.map(provider => provider.id), ['evm'])
    await render('embedded', [providers[0]])
    assert.deepEqual(funding.providers, [])
    assert.deepEqual(titles(), ['Deposit address'])
    await act(() => buttons()[0].click())
    assert.equal(navigation.step, 'transfer-crypto')
})
