import assert from 'node:assert/strict'
import test from 'node:test'
import { createPublicClient, custom, decodeFunctionData, encodeAbiParameters, parseAbi, parseTransaction } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { resolveOpStackL1Fee, resolveOpStackOperatorFee } from '../dist/esm/gasProviders/resolveOpStackAdditionalFees.js'

const abi = parseAbi([
    'function getL1Fee(bytes transaction) view returns (uint256)',
    'function getOperatorFee(uint256 gasUsed) view returns (uint256)',
])
const oracle = '0x420000000000000000000000000000000000000F'
const account = `0x${'11'.repeat(20)}`
const to = `0x${'22'.repeat(20)}`

for (const chain of [base, baseSepolia]) {
    for (const [name, value, data] of [
        ['native deposit', 12_728_302_757_382_187n, '0xc8d430a1a75548f49ec3d99fa6ab58872a50760c10edb4270000000001553f47'],
        ['token deposit', 0n, '0xa9059cbb12345678'],
    ]) {
        test(`chain ${chain.id}: real viem serializes ${name} once with the original calldata, target and value`, async () => {
            const seen = []
            const publicClient = createPublicClient({ chain, transport: custom({
                request: async ({ method, params }) => {
                    assert.equal(method, 'eth_call')
                    assert.equal(params[0].to.toLowerCase(), oracle.toLowerCase())
                    const call = decodeFunctionData({ abi, data: params[0].data })
                    seen.push(call)
                    if (call.functionName === 'getL1Fee') {
                        const parsed = parseTransaction(call.args[0])
                        assert.equal(parsed.data, data)
                        assert.equal(parsed.to.toLowerCase(), to.toLowerCase())
                        assert.equal(parsed.value ?? 0n, value)
                        assert.equal(parsed.chainId, chain.id)
                        return encodeAbiParameters([{ type: 'uint256' }], [123_456n])
                    }
                    assert.deepEqual(call.args, [27_138n])
                    return encodeAbiParameters([{ type: 'uint256' }], [654_321n])
                },
            }) })
            const context = { publicClient, network: { chain_id: String(chain.id) } }
            const [l1Fee, operatorFee] = await Promise.all([
                resolveOpStackL1Fee({ ...context, transaction: { account, to, value, data } }),
                resolveOpStackOperatorFee({ ...context, gasLimit: 27_138n }),
            ])
            assert.equal(l1Fee, 123_456n)
            assert.equal(operatorFee, 654_321n)
            assert.deepEqual(seen.map(call => call.functionName).sort(), ['getL1Fee', 'getOperatorFee'])
        })
    }

}

test('non-OP chains do not request rollup fees', async () => {
    const publicClient = createPublicClient({ chain: base, transport: custom({
        request: async () => assert.fail('Unexpected oracle RPC'),
    }) })
    const context = { publicClient, network: { chain_id: '1' } }
    assert.equal(await resolveOpStackL1Fee({ ...context, transaction: { account, to } }), 0n)
    assert.equal(await resolveOpStackOperatorFee({ ...context, gasLimit: 21_000n }), 0n)
})
