import assert from 'node:assert/strict'
import test, { after, afterEach, beforeEach } from 'node:test'
import * as React from 'react'
import { JSDOM } from 'jsdom'
import { Slot } from '@radix-ui/react-slot'
import { loadSource } from './helpers/source.mjs'

const dom = new JSDOM('<html><body></body></html>')
const previous = Object.getOwnPropertyDescriptors(globalThis)
const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true }
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
const { createRoot } = await import('react-dom/client')
const { createElement: h, act } = React
const empty = () => null
const settingsContext = { useInitialSettings: () => initialSettings }
const btc = { name: 'BITCOIN_MAINNET', display_name: 'Bitcoin', type: 'bitcoin', deposit_methods: ['wallet', 'deposit_address'], tokens: [{ symbol: 'BTC', asset: 'BTC', status: 'active' }] }
const eth = { name: 'ETHEREUM_MAINNET', display_name: 'Ethereum', type: 'evm', deposit_methods: ['wallet', 'deposit_address'], tokens: [{ symbol: 'ETH', asset: 'ETH', status: 'active' }] }
const routes = { sourceRoutes: [btc, eth], destinationRoutes: [btc, eth], networks: [], sourceExchanges: [] }
const { generateSwapInitialValues } = loadSource('lib/generateSwapInitialValues.ts', {
    './address/Address': { Address: { isValid: () => true } },
    './extendedRoutes/registry': { mergeExtendedSourceRoutes: routes => routes },
})
const { manualTransferAvailable } = loadSource('helpers/manualTransferAvailable.ts')
const { default: SubmitButton } = loadSource('components/Buttons/submitButton.tsx', {
    '../Icons/spinIcon': { default: empty }, clsx: { default: (...classes) => classes.filter(value => typeof value === 'string').join(' ') },
})
const { default: AddressButton } = loadSource('components/Input/Address/AddressPicker/AddressButton.tsx', { '@radix-ui/react-slot': { Slot } })
const { default: ManualTransferOption } = loadSource('components/Input/ManualTransferOption.tsx', {
    'lucide-react': { QrCode: empty }, '@/components/Icons/FilledCheck': { default: empty },
})
let root, container, values, initialSettings, provider, providersReady, connectOptions, finishConnect, selectedAccount, addressOpened
const connect = (_provider, options) => {
    connectOptions = options
    return new Promise(resolve => { finishConnect = resolve })
}
const Drawer = ({ show, header, children }) => show ? h('section', { role: 'dialog' }, header, children) : null
Drawer.Snap = ({ children }) => children
const { FormSourceWalletButton, default: SourceWalletPicker } = loadSource('components/Input/SourceWalletPicker.tsx', {
    react: React,
    formik: { useFormikContext: () => ({ values, setFieldValue: (key, value) => { values = { ...values, [key]: value } } }) },
    '@/hooks/useWallet': { default: () => ({ provider }) },
    '@layerswap/wallet-core': { useProvidersConnectReady: () => providersReady },
    'lucide-react': { ChevronDown: empty },
    '@/components/Modal/vaulModal': { default: Drawer },
    '@layerswap/ui-kit/components': { WalletIcon: empty },
    '@/components/Wallet/WalletIconView': { default: empty },
    '@/components/Buttons/submitButton': { default: SubmitButton },
    '@/components/Wallet/WalletModal': { useConnectModal: () => ({ connect, cancel: () => finishConnect?.() }) },
    '@/components/Wallet/WalletComponents/WalletsList': { default: ({ wallets, onSelect }) => wallets.map(wallet => h('button', { key: wallet.id, onClick: () => onSelect({ walletId: wallet.id, address: wallet.address, providerName: wallet.providerName }) }, wallet.id)) },
    '@/context/swapAccounts': { useSelectedAccount: () => undefined, useSelectSwapAccount: () => account => { selectedAccount = account } },
    '@/stores/addressBookStore': { useNamedAddress: () => '' },
    './ManualTransferOption': { default: ManualTransferOption },
    '@/context/settings': settingsContext,
    '@/helpers/manualTransferAvailable': { manualTransferAvailable },
})
const { default: FormButton } = loadSource('components/Pages/Swap/Form/SecondaryComponents/FormButton.tsx', {
    '@/components/Input/SourceWalletPicker': { FormSourceWalletButton },
    '@/components/Buttons/submitButton': { default: SubmitButton },
    '@/context/settings': settingsContext,
    '@/components/Input/Address': { default: ({ children, triggerAsChild }) => h(AddressButton, { asChild: triggerAsChild, destination: values.to, openAddressModal: () => { addressOpened++ } }, children({})) },
})
const validAddress = '0x1111111111111111111111111111111111111111'
beforeEach(() => {
    values = { from: btc, to: eth, fromAsset: btc.tokens[0], toAsset: eth.tokens[0], amount: '0.01', destination_address: '', depositMethod: 'wallet' }
    initialSettings = {}
    provider = { connectedWallets: [] }
    providersReady = true
    connectOptions = undefined
    finishConnect = undefined
    selectedAccount = undefined
    addressOpened = 0
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => { await act(() => root.unmount()); container.remove() })
after(() => {
    dom.window.close()
    for (const key of Object.keys(globals)) {
        if (previous[key]) Object.defineProperty(globalThis, key, previous[key])
        else delete globalThis[key]
    }
})
const render = element => act(() => root.render(element))
const click = element => act(() => element.click())

test('fresh swap defaults to native BTC → ETH without changing the settings or adding an amount/address', () => {
    const query = {}
    const result = generateSwapInitialValues(routes, query, 'cross-chain')
    assert.equal(result.from, btc)
    assert.equal(result.to, eth)
    assert.equal(result.fromAsset.symbol, 'BTC')
    assert.equal(result.toAsset.symbol, 'ETH')
    assert.ok(!result.amount)
    assert.equal(result.destination_address, '')
    assert.deepEqual(query, {})
})
test('explicit reverse pairs and partial partner selections take precedence', () => {
    const result = generateSwapInitialValues(routes, { from: eth.name, fromAsset: 'ETH', to: btc.name, toAsset: 'BTC', amount: '1' }, 'cross-chain')
    assert.equal(result.from, eth)
    assert.equal(result.to, btc)
    assert.equal(result.amount, '1')
    for (const query of [{ from: eth.name }, { to: btc.name }, { from: 'UNAVAILABLE' }, { lockTo: true }, { hideFrom: true }]) {
        const result = generateSwapInitialValues(routes, query, 'cross-chain')
        assert.ok(!result.from || !result.to)
    }
})
test('defaults do not invent unsupported assets or change other form modes', () => {
    for (const mode of ['exchange', 'deposit-address']) {
        const result = generateSwapInitialValues(routes, {}, mode)
        assert.equal(result.from, undefined)
        assert.equal(result.to, undefined)
    }
    for (const settings of [{ ...routes, sourceRoutes: [] }, { ...routes, destinationRoutes: [{ ...eth, tokens: [{ ...eth.tokens[0], status: 'inactive' }] }] }]) {
        const result = generateSwapInitialValues(settings, {}, 'cross-chain')
        assert.equal(result.from, undefined)
        assert.equal(result.to, undefined)
    }
})
test('missing address opens the existing picker despite validation and quote loading, without nested buttons', async () => {
    values.depositMethod = 'deposit_address'
    await render(h(FormButton, { values, disabled: true, error: 'Enter destination address', isQuoteLoading: true, isSubmitting: false, shouldConnectWallet: false }))
    assert.equal(container.querySelector('button button'), null)
    const button = container.querySelector('button')
    assert.equal(button.disabled, false)
    assert.match(button.textContent, /Enter destination address/)
    await click(button)
    assert.equal(addressOpened, 1)
    await render(h(FormButton, { values, disabled: true, error: '', isSubmitting: true, shouldConnectWallet: false }))
    await click(container.querySelector('button'))
    assert.equal(addressOpened, 1)
})
test('method selection comes first and remains accessible while wallet providers load', async () => {
    providersReady = false
    values.amount = ''
    await render(h(FormButton, { values, disabled: true, error: 'Enter an amount', isQuoteLoading: true, isSubmitting: false, shouldConnectWallet: true }))
    const button = container.querySelector('button')
    assert.match(button.textContent, /Select swap method/)
    assert.equal(button.disabled, false)
    await click(button)
    assert.equal(connectOptions.title, 'Select swap method')
    await render(connectOptions.bottomContent)
    assert.match(container.textContent, /Transfer Manually/)
    const before = { ...values }
    await click(container.querySelector('button'))
    assert.deepEqual(values, { ...before, depositMethod: 'deposit_address' })
})
test('connected users also get a manual option, and wallet selection records the account and method', async () => {
    provider.connectedWallets = [{ id: 'Test wallet', address: validAddress, providerName: 'evm' }]
    await render(h(FormSourceWalletButton))
    await click(container.querySelector('button'))
    assert.match(container.textContent, /Transfer Manually/)
    assert.equal(container.querySelector('button button'), null)
    await click([...container.querySelectorAll('button')].find(button => button.textContent === 'Test wallet'))
    assert.equal(selectedAccount.address, validAddress)
    assert.equal(values.depositMethod, 'wallet')
    assert.equal(container.querySelector('[role=dialog]'), null)
})
test('manual transfer is not offered for unsupported or partner-restricted routes', async () => {
    for (const settings of [{ hideDepositMethod: true, depositMethod: 'wallet' }, { sameAccountNetwork: eth.name }]) {
        assert.equal(manualTransferAvailable(values, settings), false)
    }
    values.from = { ...btc, deposit_methods: ['wallet'] }
    assert.equal(manualTransferAvailable(values, {}), false)
    await render(h(FormSourceWalletButton))
    assert.match(container.textContent, /Connect a wallet/)
    await click(container.querySelector('button'))
    assert.equal(connectOptions.bottomContent, undefined)
})
test('a partner-locked manual method cannot be switched to a wallet from the source picker', async () => {
    values.depositMethod = 'deposit_address'
    initialSettings = { hideDepositMethod: true, depositMethod: 'deposit_address' }
    await render(h(SourceWalletPicker))
    assert.match(container.textContent, /Manual Transfer/)
    assert.equal(container.querySelector('button'), null)
})
test('a new compatible wallet selects wallet funding without changing the pair, amount or recipient', async () => {
    const before = { ...values, destination_address: validAddress }
    values = before
    await render(h(FormSourceWalletButton))
    await click(container.querySelector('button'))
    await act(() => finishConnect({ id: 'btc-wallet', address: 'btc-source', providerName: 'bitcoin', withdrawalSupportedNetworks: [btc.name] }))
    assert.equal(selectedAccount.id, 'btc-wallet')
    assert.deepEqual(values, before)
})
test('connecting an unrelated wallet during provider discovery does not select it for this route', async () => {
    providersReady = false
    await render(h(FormSourceWalletButton))
    await click(container.querySelector('button'))
    await act(() => finishConnect({ id: 'evm-wallet', address: validAddress, providerName: 'evm', withdrawalSupportedNetworks: [eth.name] }))
    assert.equal(selectedAccount, undefined)
})
