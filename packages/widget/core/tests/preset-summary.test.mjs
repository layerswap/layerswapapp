import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadSource, rounding } from './helpers/source.mjs'

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

test('summary shows the requested and received amounts in token and USD values', () => {
    const markup = renderToStaticMarkup(createElement(SummaryView, {
        swap: {
            source_network: { display_name: 'Arbitrum One' },
            destination_network: { display_name: 'Base' },
            source_token: eth, destination_token: usdc, requested_amount: '0.05',
        },
        quote: { quote: { source_token: eth, destination_token: usdc } },
        receiveAmount: 99.5,
    }))
    assert.match(markup, />0\.05 ETH</)
    assert.match(markup, />\$100</)
    assert.match(markup, />99\.5 USDC</)
    assert.match(markup, />\$99\.5</)
})
