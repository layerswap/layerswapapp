import assert from 'node:assert/strict'
import test from 'node:test'

const { resolveSwapPageRedirect } = await import('../swapPageRedirect.ts')

const swap = (overrides = {}) => ({
    transactions: [],
    use_deposit_address: false,
    requested_amount: 0.1,
    source_network: { name: 'BITCOIN_MAINNET' },
    destination_network: { name: 'ETHEREUM_MAINNET' },
    source_token: { symbol: 'BTC' },
    destination_token: { symbol: 'ETH' },
    ...overrides,
})
const resolve = (swapOverrides, query = {}, persistentParams = {}) => resolveSwapPageRedirect({
    swap: swap(swapOverrides), query, persistentParams, formattedAmount: '0.1',
})
const destinationParams = redirect => new URL(redirect.destination, 'https://layerswap.io').searchParams

test('an unfunded manual transfer stays on its swap page', () => {
    assert.equal(resolve({ use_deposit_address: true }), null)
    assert.equal(resolve({ use_deposit_address: true, requested_amount: '0.1' }), null)
})

test('swaps with transactions or no swap data render the swap page', () => {
    assert.equal(resolve({ transactions: [{ type: 'input' }] }), null)
    assert.equal(resolve({ transactions: undefined }), null)
    assert.equal(resolveSwapPageRedirect({ swap: undefined, query: {}, persistentParams: {}, formattedAmount: '' }), null)
})

test('unfunded wallet, exchange and easy deposit swaps return to the form without a permanent redirect', () => {
    for (const [overrides, query] of [
        [{}, {}],
        [{ use_deposit_address: true, source_exchange: { name: 'BINANCE' } }, {}],
        [{ use_deposit_address: true, requested_amount: 0 }, {}],
        [{ use_deposit_address: true }, { defaultTab: 'deposit' }],
    ]) {
        const redirect = resolve(overrides, query)
        assert.ok(redirect)
        assert.equal(redirect.permanent, false)
    }
})

test('the redirect keeps persistent params and takes the route from the swap', () => {
    const redirect = resolve({}, {}, { appName: 'partner', defaultTab: 'swap', from: 'SOLANA_MAINNET', amount: '5' })
    const params = destinationParams(redirect)
    assert.equal(params.get('appName'), 'partner')
    assert.equal(params.get('defaultTab'), 'swap')
    assert.equal(params.get('from'), 'BITCOIN_MAINNET')
    assert.equal(params.get('to'), 'ETHEREUM_MAINNET')
    assert.equal(params.get('fromAsset'), 'BTC')
    assert.equal(params.get('toAsset'), 'ETH')
    assert.equal(params.get('amount'), '0.1')
    assert.deepEqual(params.getAll('from'), ['BITCOIN_MAINNET'])
})
