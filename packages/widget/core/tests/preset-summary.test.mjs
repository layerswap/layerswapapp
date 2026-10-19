import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { loadSource, rounding } from './helpers/source.mjs'

const SummaryView = loadSource('components/Pages/Swap/Withdraw/Presentation/SummaryView.tsx', {
    '@layerswap/utils': rounding,
    'lucide-react': { ArrowDown: () => null, Fuel: () => null },
    '@/components/Common/NumFlowWithFallback': {
        default: ({ value, prefix = '', suffix = '' }) => createElement('span', { 'data-value': value }, `${prefix}${value}${suffix}`),
    },
    '@/components/Input/Amount/PriceImpact': { PriceImpact: () => null },
    '@layerswap/ui-kit': { ImageWithFallback: () => null },
}).default

const eth = { asset: 'ETH', precision: 8, decimals: 18, price_in_usd: 2000 }
const usdc = { asset: 'USDC', precision: 6, decimals: 6, price_in_usd: 1 }

function createSummary(initial = {}) {
    const state = {
        swapBasicData: {
            source_network: { name: 'ARBITRUM_MAINNET', display_name: 'Arbitrum One' },
            destination_network: { name: 'BASE_MAINNET', display_name: 'Base' },
            source_token: eth,
            destination_token: usdc,
            requested_amount: '0.05',
            amountMode: 'max',
        },
        quote: { source_token: eth, destination_token: usdc, receive_amount: 99.5 },
        amountPresetLocked: false,
        isUsdMode: false,
        ...initial,
    }
    const SwapSummary = loadSource('components/Pages/Swap/Withdraw/Summary/index.tsx', {
        '@/context/swap': { useSwapDataState: () => state },
        './Summary': { default: props => createElement(SummaryView, { ...props, isUsdMode: state.isUsdMode }) },
        '@/lib/apiClients/layerSwapApiClient': { TransactionType: { Input: 'input', Output: 'output' } },
        '@/lib/address/Address': { Address: {} },
        '@/lib/knownIds': { default: { Exchanges: { Coinbase: 'COINBASE' } } },
        '@/context/settings': { useInitialSettings: () => ({}) },
        '@/context/swapAccounts': { useSelectedAccount: () => ({ address: 'source' }) },
    }).default
    return {
        state,
        render: () => new JSDOM(renderToStaticMarkup(createElement(SwapSummary))).window.document,
    }
}

for (const isUsdMode of [false, true]) {
    test(`review shows amounts without preset badges in ${isUsdMode ? 'USD' : 'token'} mode`, () => {
        const { state, render } = createSummary({ isUsdMode })
        state.swapBasicData.amountMode = 'manual'
        const manualSummary = render().body.innerHTML
        for (const preset of ['min', 'half', 'max']) {
            state.swapBasicData.amountMode = preset
            const document = render()
            assert.equal(document.body.innerHTML, manualSummary)
            assert.equal(document.querySelector('[data-value="100"]').textContent, '$100')
            assert.match(document.body.textContent, /0.05 ETH/)
            assert.doesNotMatch(document.body.textContent, /Amount preset:|Min|50%|Max/)
        }
    })
}

test('confirmation and swap creation do not change the preset review presentation', () => {
    const { state, render } = createSummary()
    const review = render().body.innerHTML
    state.amountPresetLocked = true
    assert.equal(render().body.innerHTML, review)
    state.amountPresetLocked = false
    assert.equal(render().body.innerHTML, review)
    state.swapId = 'created-swap'
    assert.equal(render().body.innerHTML, review)
})

test('empty source amounts omit their value and preset label', () => {
    const { state, render } = createSummary()
    state.swapBasicData.requested_amount = ''
    const document = render()
    assert.equal(document.querySelector('[data-value="100"]'), null)
    assert.doesNotMatch(document.body.textContent, /Amount preset:|Min|50%|Max/)
})
