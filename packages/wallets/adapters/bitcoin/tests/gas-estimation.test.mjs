import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import axios from 'axios'

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !extname(specifier) && context.parentURL?.includes('/dist/esm/')) {
        try { return nextResolve(`${specifier}.js`, context) }
        catch (error) {
            if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
            return nextResolve(`${specifier}/index.js`, context)
        }
    }
    return nextResolve(specifier, context)
} })
after(() => hooks.deregister())
const { BitcoinGasProvider } = await import('../dist/esm/bitcoinGasProvider.js')
const provider = new BitcoinGasProvider()
const token = { symbol: 'BTC', decimals: 8 }
const network = { name: 'BITCOIN_MAINNET', token }
const args = { network, token, address: 'source' }

function mockNetwork(t, values, fees = { economyFee: 2 }) {
    const requests = []
    t.mock.method(axios, 'get', async url => {
        requests.push(url)
        if (url.endsWith('/utxo')) return { data: values.map(value => ({ value })) }
        assert.ok(url.endsWith('/fees/recommended'), 'Gas estimation must not fetch raw transactions or build a PSBT')
        return { data: fees }
    })
    return requests
}

test('Bitcoin estimates without amount and budgets every input, change, and the memo', async t => {
    const requests = mockNetwork(t, [400000, 600000])
    const result = await provider.getGas(args)
    // 2 * 149 input bytes + 2 * 43 outputs + 92 memo + 20 overhead = 496.
    assert.deepEqual(result, { gas: 0.00000992, token })
    assert.equal(requests.length, 2)
    for (const amount of [0, 0.5, NaN, 0.00998988]) {
        assert.deepEqual(await provider.getGas({ ...args, amount }), result)
    }
})

test('Bitcoin fee grows with input count, independently of the entered amount', async t => {
    mockNetwork(t, [100000])
    const oneInput = await provider.getGas(args)
    assert.equal(oneInput.gas, 0.00000694)
    mockNetwork(t, [50000, 50000])
    const twoInputs = await provider.getGas(args)
    assert.ok(twoInputs.gas > oneInput.gas)
})

test('Bitcoin returns unavailable when there are no spendable inputs', async t => {
    const requests = mockNetwork(t, [])
    assert.equal(await provider.getGas(args), undefined)
    assert.equal(requests.length, 1)
})

for (const rate of [0, -1, NaN, Infinity, undefined]) {
    test(`Bitcoin rejects invalid fee rate ${rate}`, async t => {
        mockNetwork(t, [100000], { economyFee: rate })
        await assert.rejects(provider.getGas(args), /Invalid recommended Bitcoin fee/)
    })
}

test('Bitcoin propagates RPC failures instead of treating fees as zero', async t => {
    t.mock.method(axios, 'get', async () => { throw new Error('offline') })
    await assert.rejects(provider.getGas(args), /offline/)
})
