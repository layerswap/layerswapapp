import assert from 'node:assert/strict'
import test from 'node:test'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { loadSource, refundAddress } from './helpers/source.mjs'
import { Address } from './helpers/address.mjs'

const dom = new JSDOM('<div id="root"></div>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const noop = () => {}
const empty = () => null
const source = { name: 'ETHEREUM_SEPOLIA', type: 'evm', token: { symbol: 'ETH' } }
const token = { symbol: 'ETH' }
const address = '0x1234567890123456789012345678901234567890'
const initial = {
    id: 'accepted', source_network: source, source_token: token,
    destination_network: source, destination_token: { symbol: 'UNI' },
    destination_address: '0x2222222222222222222222222222222222222222',
    source_exchange: { name: 'BINANCE' }, requested_amount: '0.005',
    use_deposit_address: true, refund_address: address,
}

for (const [label, network, selectedToken, expectedRefund] of [
    ['same network and token', source, token, address],
    ['different token on the same network', source, { symbol: 'USDC' }, address],
    ['different network of the same address type', { ...source, name: 'BASE_SEPOLIA' }, token, undefined],
]) {
    test(`exchange source reselection: ${label}`, async t => {
        let select, quoted, submitted, selectedId
        const { default: ManualWithdraw } = loadSource('components/Pages/Swap/Withdraw/ManualWithdraw.tsx', {
            react: { ...React, default: React },
            './Presentation/ManualSourceSelectorView': { ManualSourceSelectorView: props => { select = props.onSelect; return null } },
            './Presentation/DepositQRCodeView': { DepositQRCodeView: empty },
            './Presentation/ManualDepositButtonView': { ManualDepositButtonView: empty },
            '@/components/Input/Address/AddressPicker/AddressWithIcon': { ExtendedAddress: empty },
            '@/components/Input/Address/RefundAddressSummary': { default: empty },
            '@/components/Widget/Index': { Widget: { Footer: ({ children }) => children } },
            '@/context/asyncModal': { useAsyncModal: () => ({ getConfirmation: async () => true }) },
            '@/context/settings': { useInitialSettings: () => ({}) },
            '@/context/swap': {
                useSwapDataState: () => ({ swapDetails: initial }),
                useSwapDataUpdate: () => ({
                    createSwap: async next => { submitted = next; return { swap: { id: 'next' } } },
                    setSwapId: id => { selectedId = id },
                }),
            },
            '@/helpers/depositActions': { resolveDepositAddress: () => 'deposit-address' },
            '@/hooks/useExchangeNetworks': { default: () => ({ networks: [{ network, token: selectedToken }] }) },
            '@/hooks/useWallet': { default: () => ({ wallets: [] }) },
            '@/lib/address/Address': { Address },
            '@/stores/addressBookStore': { useAddressName: noop },
            '@layerswap/ui-kit': { useCopyClipboard: () => [false, noop] },
            '@layerswap/ui-kit/components': { CopyButton: empty },
            '../Form/FeeDetails': { default: empty },
            './Presentation/ManualInstructionsView': { ManualInstructionsView: props => props.sourceSelector },
            './QuoteUpdate': { handleLimitsUpdate: async ({ swapValues }) => { quoted = swapValues } },
            '@/context/callbackProvider': { useCallbacks: () => ({ onSwapLifecycle: noop }) },
            '@/lib/swapLifecycle': { lifecycleContextFromSwap: () => ({}) },
            '@/hooks/useLifecycleObservation': { useLifecycleObservation: noop },
        })
        const root = createRoot(document.getElementById('root'))
        t.after(async () => { await act(() => root.unmount()) })
        await act(() => root.render(React.createElement(ManualWithdraw, { swapBasicData: initial, type: 'contained' })))
        await act(() => select(network, selectedToken))
        assert.equal(submitted.refund_address, expectedRefund)
        assert.equal(submitted.refundAddressNetwork, expectedRefund ? source.name : undefined)
        assert.equal(refundAddress.manualRefundAddress(quoted), expectedRefund)
        assert.equal(refundAddress.manualRefundAddress(submitted), expectedRefund)
        assert.equal(selectedId, 'next')
    })
}
