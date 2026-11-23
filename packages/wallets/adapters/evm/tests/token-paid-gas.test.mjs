import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveTokenPaidGas } from '../dist/esm/gasProviders/resolveTokenPaidGas.js'

const account = `0x${'11'.repeat(20)}`
const eth = { symbol: 'ETH', decimals: 18, price_in_usd: 3000 }
const usdc = { symbol: 'USDC', decimals: 6, contract: `0x${'22'.repeat(20)}`, price_in_usd: 1 }
const network = { name: 'LINEA_MAINNET', chain_id: '59144', token: eth }
const wallet = (alternateGasFees, chainId = 59144) => ({
    metadata: { capabilities: { [account]: { [chainId]: { atomic: 'unsupported', alternateGasFees } } } },
})
// 0.00002 ETH expected, 0.00006 ETH maximum: 0.06 / 0.18 USDC.
const nativeGas = { gas: 0.00002, maxFee: 0.00006 }

function client({ native = 0n, token = 100_000_000n } = {}) {
    const calls = []
    return {
        calls,
        getBalance: async args => { calls.push('getBalance'); assert.equal(args.address, account); return native },
        readContract: async args => { calls.push('balanceOf'); assert.deepEqual(args.args, [account]); return token },
    }
}

const resolve = (overrides = {}) => resolveTokenPaidGas({
    publicClient: client(), network, token: usdc, wallet: wallet(true), account, amount: 1, nativeGas, ...overrides,
})

test('prices the fee in the token when native funds fall short and the token covers amount and fee', async () => {
    const gas = await resolve()
    assert.equal(gas.token, usdc)
    assert.ok(Math.abs(gas.gas - 0.06) < 1e-9)
    assert.ok(Math.abs(gas.maxFee - 0.18) < 1e-9)
})

test('a global capability entry applies to the source chain', async () => {
    assert.equal((await resolve({ wallet: wallet(true, 0) })).token, usdc)
})

test('Max leaves no token for the fee, so the native fee stands', async () => {
    assert.equal(await resolve({ amount: 100 }), undefined)
    assert.equal((await resolve({ amount: 99.8 })).token, usdc)
})

test('a native balance that covers the maximum fee keeps the native fee', async () => {
    assert.equal(await resolve({ publicClient: client({ native: 60_000_000_000_000n }) }), undefined)
    assert.equal((await resolve({ publicClient: client({ native: 59_999_999_999_999n }) })).token, usdc)
})

for (const [name, overrides] of [
    ['no alternate gas capability', { wallet: wallet(false) }],
    ['no wallet', { wallet: undefined }],
    ['a capability for another chain', { wallet: wallet(true, 1) }],
    ['a native token transfer', { token: { ...eth, contract: null } }],
    ['a missing token price', { token: { ...usdc, price_in_usd: 0 } }],
    ['a missing native price', { network: { ...network, token: { ...eth, price_in_usd: undefined } } }],
    ['a native account reserve', { nativeGas: { ...nativeGas, reserve: 0.1 } }],
]) {
    test(`${name} keeps the native fee without reading balances`, async () => {
        const publicClient = client()
        assert.equal(await resolve({ ...overrides, publicClient }), undefined)
        assert.deepEqual(publicClient.calls, [])
    })
}
