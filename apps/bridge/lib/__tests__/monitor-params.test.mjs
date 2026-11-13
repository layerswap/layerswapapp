import assert from 'node:assert/strict'
import test from 'node:test'

const { resolveMonitorRedirect } = await import('../monitorParams.ts')

const redirectParams = (query) => {
    const destination = resolveMonitorRedirect(query, '/')
    assert.ok(destination?.startsWith('/?'))
    return Object.fromEntries(new URLSearchParams(destination.slice(2)))
}

test('a known monitor pair becomes the canonical route with manual transfer selected', () => {
    assert.deepEqual(redirectParams({ cur_from: 'BTC', cur_to: 'eth', amt_from: '0.1', rid: '42' }), {
        rid: '42',
        from: 'BITCOIN_MAINNET',
        fromAsset: 'BTC',
        to: 'ETHEREUM_MAINNET',
        toAsset: 'ETH',
        amount: '0.1',
        depositMethod: 'deposit_address',
    })
})

test('links without a known monitor code are left alone', () => {
    assert.equal(resolveMonitorRedirect({}, '/'), null)
    assert.equal(resolveMonitorRedirect({ cur_from: 'XXX', cur_to: 'YYY' }, '/'), null)
    assert.equal(resolveMonitorRedirect({ from: 'BITCOIN_MAINNET' }, '/'), null)
})

test('an unknown code on one side is dropped and the known side is kept', () => {
    assert.deepEqual(redirectParams({ cur_from: 'BTC', cur_to: 'YYY' }), {
        from: 'BITCOIN_MAINNET',
        fromAsset: 'BTC',
        depositMethod: 'deposit_address',
    })
})

test('manual transfer is not preselected without a resolved source', () => {
    assert.deepEqual(redirectParams({ cur_from: 'XXX', cur_to: 'ETH' }), {
        to: 'ETHEREUM_MAINNET',
        toAsset: 'ETH',
    })
})

test('only a positive decimal amount is carried over', () => {
    for (const amt_from of ['0', '-1', 'abc', '1e3', '0.1.2', '', '1,5']) {
        assert.equal(redirectParams({ cur_from: 'BTC', cur_to: 'ETH', amt_from }).amount, undefined, amt_from)
    }
    assert.equal(redirectParams({ cur_from: 'BTC', cur_to: 'ETH', amt_from: '.5' }).amount, '.5')
})

test('a receive amount is ignored', () => {
    const params = redirectParams({ cur_from: 'BTC', cur_to: 'ETH', amt_to: '1' })
    assert.equal(params.amount, undefined)
    assert.equal(params.amt_to, undefined)
})

test('explicit canonical params win over monitor params', () => {
    assert.deepEqual(redirectParams({
        cur_from: 'BTC', cur_to: 'ETH', amt_from: '0.1',
        from: 'ETHEREUM_MAINNET', fromAsset: 'USDC', amount: '5', depositMethod: 'wallet',
    }), {
        from: 'ETHEREUM_MAINNET',
        fromAsset: 'USDC',
        amount: '5',
        depositMethod: 'wallet',
        to: 'ETHEREUM_MAINNET',
        toAsset: 'ETH',
    })
})

test('the redirect stays on the requested path', () => {
    assert.ok(resolveMonitorRedirect({ cur_from: 'BTC' }, '/transactions').startsWith('/transactions?'))
})

test('token codes resolve to the network named in the code', () => {
    const params = redirectParams({ cur_from: 'USDTTRC20', cur_to: 'GRAM' })
    assert.equal(params.from, 'TRON_MAINNET')
    assert.equal(params.fromAsset, 'USDT')
    assert.equal(params.to, 'TON_MAINNET')
    assert.equal(params.toAsset, 'TON')
})
