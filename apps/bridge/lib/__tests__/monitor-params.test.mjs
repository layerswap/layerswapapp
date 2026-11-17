import assert from 'node:assert/strict'
import test from 'node:test'

const { resolveMonitorRedirect } = await import('../monitorParams.ts')

const params = query => Object.fromEntries(new URLSearchParams(resolveMonitorRedirect(query, '/').slice(2)))

test('monitor links redirect to the canonical route', () => {
    assert.deepEqual(params({ cur_from: 'BTC', cur_to: 'eth', amt_from: '0.1', amt_to: '1' }), {
        from: 'BITCOIN_MAINNET', fromAsset: 'BTC', to: 'ETHEREUM_MAINNET', toAsset: 'ETH',
        amount: '0.1', depositMethod: 'deposit_address',
    })
    assert.equal(params({ cur_from: 'BTC', amt_from: '1e3' }).amount, undefined)
    assert.deepEqual(params({ cur_from: 'XXX', cur_to: 'ETH' }), { to: 'ETHEREUM_MAINNET', toAsset: 'ETH' })
    assert.equal(resolveMonitorRedirect({ cur_from: 'XXX', cur_to: 'YYY' }, '/'), null)
})

test('explicit canonical params win', () => {
    assert.deepEqual(params({ cur_from: 'BTC', from: 'ETHEREUM_MAINNET', fromAsset: 'USDC', depositMethod: 'wallet' }), {
        from: 'ETHEREUM_MAINNET', fromAsset: 'USDC', depositMethod: 'wallet',
    })
})
