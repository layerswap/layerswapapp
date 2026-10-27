import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import { JSDOM } from 'jsdom'
import { act, createElement } from 'react'

const dom = new JSDOM('<!doctype html><html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
}
const react = JSON.stringify(import.meta.resolve('react'))
const mocks = new Map([
    ['/hooks/useWallet', 'export default () => ({ wallets: globalThis.__pickerFixture.wallets, providers: globalThis.__pickerFixture.providers })'],
    ['/context/swapAccounts', 'export const useSelectSwapAccount = () => () => { throw new Error("The login wallet must not be selected") }'],
    ['/depositSelectionContext', 'export const useDepositSelection = () => globalThis.__pickerFixture'],
    ['/DestinationTokenPicker', `import { createElement } from ${react}; export default () => createElement('select', { 'aria-label': 'Destination token' }, createElement('option', null, 'USDC'), createElement('option', null, 'USDT'))`],
    ['/useExtendedDepositOption', 'export const useExtendedDepositOption = id => ({ present: true, available: true, networkName: id, network: { display_name: id } })'],
    ['/Icons/ConnectorIcons', 'export const ResolveConnectorIcon = () => null'],
    ['/lib/address/Address', 'export class Address { toShortString() { return "0x123…456" } }'],
    ['@layerswap/ui-kit/components', 'export const WalletIcon = () => null; export const ImageWithFallback = () => null'],
])
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    // Replace data/SDK boundaries and unrelated subviews, keeping the real
    // picker, cards, settings, and navigation under test.
    if (context.parentURL?.endsWith('/Options/MethodPicker.js')) {
        for (const [suffix, source] of mocks) {
            if (specifier.endsWith(suffix)) return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true }
        }
    }
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        const file = `${specifier}.js`
        return nextResolve(existsSync(new URL(file, context.parentURL)) ? file : `${specifier}/index.js`, context)
    }
    return nextResolve(specifier, context)
} })
const { createRoot } = await import('react-dom/client')
const { WalletProvidersRegistryProvider } = await import('../../../wallets/core/dist/esm/context/WalletProvidersRegistryProvider.js')
const { DepositStepProvider, useDepositStep } = await import('../dist/esm/components/Pages/Deposit/depositStepContext.js')
const { DepositSettingsProvider } = await import('../dist/esm/context/depositSettings.js')
const { default: MethodPicker } = await import('../dist/esm/components/Pages/Deposit/Options/MethodPicker.js')
const providers = [{ id: 'evm', loadProvider: async () => { throw new Error('SDK must stay lazy') } }]
let root, container, navigation
function Probe({ methods }) {
    navigation = useDepositStep()
    return createElement(DepositSettingsProvider, { value: { methods, embeddedHostWallet: navigation.embeddedHostWallet } },
        navigation.step === 'method-picker' ? createElement(MethodPicker) : createElement('output', null, navigation.step))
}
const render = (methods, status = 'embedded') => act(() => root.render(
    createElement(WalletProvidersRegistryProvider, { walletProviders: providers, networks: [], networkAdapter: {} },
        createElement(DepositStepProvider, { hostWalletStatus: status }, createElement(Probe, { methods }))),
))
const buttons = () => [...container.querySelectorAll('button')]
const titles = () => buttons().map(button => button.querySelector('.font-semibold').textContent)
beforeEach(() => {
    globalThis.__pickerFixture = { wallets: [], providers: [{ id: 'svm', name: 'Solana', isStub: true, ready: false }], destination: { name: 'BASE_MAINNET' }, destinationToken: { symbol: 'USDC' } }
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); delete globalThis.__pickerFixture })
after(() => {
    hooks.deregister()
    dom.window.close()
    for (const key of ['window', 'document', 'IS_REACT_ACT_ENVIRONMENT']) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})

test('embedded sessions show exactly Deposit address and More wallets for conflicting or empty method lists', async () => {
    for (const methods of [undefined, [], ['wallet'], ['hyperliquid', 'polymarket']]) {
        await render(methods)
        assert.deepEqual(titles(), ['Deposit address', 'More wallets'])
        assert.ok(container.querySelector('[aria-label="Destination token"]'))
        assert.ok(buttons().every(button => !button.disabled))
        await act(() => buttons()[1].click())
        assert.equal(navigation.step, 'wallet-connect')
        await act(() => navigation.back())
        assert.deepEqual(titles(), ['Deposit address', 'More wallets'])
        await act(() => buttons()[0].click())
        assert.equal(navigation.step, 'transfer-crypto')
        await act(() => navigation.back())
    }
})

test('a connected external funding account does not restore other embedded-session shortcuts', async () => {
    globalThis.__pickerFixture.wallets = [{ id: 'MetaMask', providerName: 'EVM', address: '0x123456' }]
    await render()
    assert.deepEqual(titles(), ['Deposit address', 'More wallets'])
    await render(['wallet', 'deposit_address'], 'other')
    assert.deepEqual(titles(), ['Wallet transfer', 'Deposit address', 'More wallets'])
})

test('both choices remain visible while destination selection is incomplete', async () => {
    globalThis.__pickerFixture.destinationToken = undefined
    await render()
    assert.deepEqual(titles(), ['Deposit address', 'More wallets'])
    assert.ok(buttons().every(button => button.disabled))
    await act(() => buttons()[1].click())
    assert.equal(navigation.step, 'method-picker')
})

test('More wallets is hidden when no visible and enabled funding provider remains', async () => {
    for (const fundingProviders of [[], [{ id: 'svm', hideFromList: true }], [{ id: 'svm', connectionDisabled: true }]]) {
        globalThis.__pickerFixture.providers = fundingProviders
        await render()
        assert.deepEqual(titles(), ['Deposit address'])
        await act(() => buttons()[0].click())
        assert.equal(navigation.step, 'transfer-crypto')
        await act(() => navigation.back())
    }
})
