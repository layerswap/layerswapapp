import assert from 'node:assert/strict'
import test from 'node:test'

const { resolveSwapPageRedirect } = await import('../swapPageRedirect.ts')

const resolve = (overrides, query = {}) => resolveSwapPageRedirect({
    swap: {
        transactions: [], use_deposit_address: false, requested_amount: 0.1,
        source_network: { name: 'BITCOIN_MAINNET' }, destination_network: { name: 'ETHEREUM_MAINNET' },
        source_token: { symbol: 'BTC' }, destination_token: { symbol: 'ETH' }, ...overrides,
    },
    query, persistentParams: { appName: 'partner' }, formattedAmount: '0.1',
})

test('an unfunded manual transfer stays on its swap page', () => {
    assert.equal(resolve({ use_deposit_address: true }), null)
    assert.ok(resolve({ use_deposit_address: true }, { defaultTab: 'deposit' }))
})

test('other unfunded swaps redirect temporarily and keep persistent params', () => {
    const redirect = resolve({})
    assert.equal(redirect.permanent, false)
    assert.equal(new URL(redirect.destination, 'https://x').searchParams.get('appName'), 'partner')
})
