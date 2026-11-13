import assert from 'node:assert/strict'
import test from 'node:test'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadSource } from './helpers/source.mjs'

const h = React.createElement
const empty = () => null
const { DetailedEstimatesView } = loadSource('components/Pages/Swap/Form/FeeDetails/SwapQuote/DetailedEstimatesView.tsx', {
    react: React,
    '@/lib/address/Address': { Address: { isValid: () => false } },
    '@/components/utils/ShortenString': { default: value => value },
    '@/components/Common/AddressDetailsView': { AddressDetailsView: empty },
    '../../../Withdraw/Presentation/QuoteEstimateRows': {
        Fees: empty, Estimates: empty, Reward: empty, RowWrapper: empty,
        Rate: ({ rate }) => h('span', null, `rate ${rate}`),
    },
})
const showsRate = values => renderToStaticMarkup(h(DetailedEstimatesView, { quote: { rate: 25 }, values })).includes('rate 25')

test('the rate row shows for wallet and manual transfers but not for exchange deposits', () => {
    assert.equal(showsRate({ depositMethod: 'wallet' }), true)
    assert.equal(showsRate({ depositMethod: 'deposit_address' }), true)
    assert.equal(showsRate({ depositMethod: 'deposit_address', fromExchange: { name: 'BINANCE' } }), false)
})
