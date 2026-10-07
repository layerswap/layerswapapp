import assert from 'node:assert/strict'
import test from 'node:test'
import { StarknetGasProvider } from '../dist/esm/starknetGasProvider.js'

const token = { symbol: 'STRK', contract: '0x456', decimals: 18 }
const network = { name: 'STARKNET_MAINNET', token }
const provider = new StarknetGasProvider()
function setup(fees) {
    const amounts = []
    const wallet = { metadata: { starknetAccount: { estimateInvokeFee: async (calls, options) => {
        assert.equal(calls.length, 2)
        assert.equal(calls[1].entrypoint, 'watch')
        assert.equal(options.skipValidate, true)
        const calldata = calls[0].calldata
        amounts.push(BigInt(calldata[1]) + (BigInt(calldata[2]) << 128n))
        const fee = fees[Math.min(amounts.length - 1, fees.length - 1)]
        if (fee instanceof Error) throw fee
        return { overall_fee: fee }
    } } } }
    return { amounts, args: { network, token, wallet } }
}

test('Starknet uses its atomic-unit probe for empty, fractional, and near-balance amounts', async () => {
    const { amounts, args } = setup([10000000000000000n])
    for (const amount of [undefined, 0, 0.5, 1e-7, NaN, 0.9898]) {
        const result = await provider.getGas({ ...args, amount })
        assert.deepEqual(result, { gas: 0.01, token })
    }
    assert.deepEqual(amounts, Array(6).fill(100000n))
})

test('Starknet returns unavailable until a wallet account exists', async () => {
    assert.equal(await provider.getGas({ network, token }), undefined)
})

test('Starknet propagates failed probe simulations', async () => {
    const { args } = setup([new Error('simulation failed')])
    await assert.rejects(provider.getGas(args), /simulation failed/)
})

test('Starknet rejects missing fee results', async () => {
    const { args } = setup([undefined])
    await assert.rejects(provider.getGas(args), /Couldn.t get fee estimation/)
})
