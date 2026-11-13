import assert from 'node:assert/strict'
import test from 'node:test'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadSource, rounding } from './helpers/source.mjs'

const h = React.createElement
const passThrough = ({ children }) => h('div', null, children)
const { ManualInstructionsView } = loadSource('components/Pages/Swap/Withdraw/Presentation/ManualInstructionsView.tsx', {
    '@/components/Widget/Content': { default: passThrough },
    '@/components/Common/RecipientAddressView': { RecipientAddressView: passThrough },
    '@/components/utils/RoundDecimals': rounding,
    '@layerswap/ui-kit/components': { ImageWithFallback: () => null },
})
const depositAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
const swapBasicData = {
    source_network: { display_name: 'Bitcoin' }, source_token: { asset: 'BTC', precision: 8 },
    destination_network: { display_name: 'Ethereum' }, destination_token: { asset: 'ETH', precision: 6 },
    destination_address: '0x1111111111111111111111111111111111111111', requested_amount: '0.1', use_deposit_address: true,
}
const render = props => renderToStaticMarkup(h(ManualInstructionsView, { swapBasicData, depositAddress, ...props }))

test('the deposit screen shows the full deposit address', () => {
    assert.ok(render().includes(depositAddress))
})

test('the receive amount waits for the quote instead of showing zero', () => {
    const loading = render()
    assert.doesNotMatch(loading, /Receive<\/span> <span>0<\/span>/)
    assert.match(loading, /animate-pulse/)
    assert.match(render({ quote: { receive_amount: 2.5 } }), /<span>2\.5<\/span>/)
})

test('the swap ID row appears only with a copy control', () => {
    assert.doesNotMatch(render(), />ID</)
    assert.match(render({ swapIdCopy: h('button', null, 'abc…123') }), />ID<\/p><button>abc…123<\/button>/)
})
