import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { amountPresets, loadSource, rounding } from './helpers/source.mjs'

const SummaryView = loadSource('components/Pages/Swap/Withdraw/Presentation/SummaryView.tsx', {
    '@/components/utils/RoundDecimals': rounding,
    'lucide-react': { ArrowDown: () => null, Fuel: () => null },
    '@/components/Common/NumFlowWithFallback': {
        default: ({ value, prefix = '', suffix = '' }) => createElement('span', { 'data-value': value }, `${prefix}${value}${suffix}`),
    },
    '@/components/Input/Amount/PriceImpact': { PriceImpact: () => null },
    '@layerswap/ui-kit/components': { ImageWithFallback: () => null },
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
        '@/lib/amountPresets': amountPresets,
    }).default
    return {
        state,
        render: () => new JSDOM(renderToStaticMarkup(createElement(SwapSummary))).window.document,
    }
}

const getBadges = document => [...document.querySelectorAll('.sr-only')]
    .filter(node => node.textContent === 'Amount preset: ')
    .map(node => node.parentElement)

for (const isUsdMode of [false, true]) {
    test(`preset badges stay beside source USD in ${isUsdMode ? 'USD' : 'token'} mode`, () => {
        const { state, render } = createSummary({ isUsdMode })
        for (const [preset, label] of [['min', 'Min'], ['half', '50%'], ['max', 'Max']]) {
            state.swapBasicData.amountMode = preset
            const badges = getBadges(render())
            assert.equal(badges.length, 1)
            assert.equal(badges[0].textContent, `Amount preset: ${label}`)
            assert.equal(badges[0].parentElement.querySelector('[data-value="100"]').textContent, '$100')
            assert.equal(badges[0].closest('button, a, [role="button"], [tabindex]'), null)
        }
    })
}

test('preset badge follows live review, confirmation lock, re-review and swap creation', () => {
    const { state, render } = createSummary()
    assert.equal(getBadges(render()).length, 1)
    state.amountPresetLocked = true
    assert.equal(getBadges(render()).length, 0)
    state.amountPresetLocked = false
    assert.equal(getBadges(render()).length, 1)
    state.swapId = 'created-swap'
    assert.equal(getBadges(render()).length, 0)
})

test('manual and empty amounts have no preset badge', () => {
    const { state, render } = createSummary()
    for (const mode of ['manual', undefined]) {
        state.swapBasicData.amountMode = mode
        assert.equal(getBadges(render()).length, 0)
    }
    state.swapBasicData.amountMode = 'max'
    state.swapBasicData.requested_amount = ''
    assert.equal(getBadges(render()).length, 0)
})
