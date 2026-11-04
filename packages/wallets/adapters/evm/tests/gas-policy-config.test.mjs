import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { registerHooks } from 'node:module'
import { extname } from 'node:path'
import { createPublicClient, custom } from 'viem'

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
const { resolveEVMGasPolicy } = await import('../dist/esm/gasProviders/evmGasPolicies.js')
const { resolveEVMFeeData } = await import('../dist/esm/gasProviders/resolveEVMFeeData.js')
const { default: resolveChain } = await import('../dist/esm/evmUtils/resolveChain.js')
const { default: NetworkSettings } = await import('../dist/esm/NetworkSettings.js')
const { KnownInternalNames } = await import('@layerswap/utils')

// Snapshot of the former NetworkSettings overrides. These must not change
// merely because fee settings move from network names into chain policies.
const migrated = [
    [1, 1.7], [56, 1.2], [324, 1.7], [137, 1.01], [42161, 4.15],
    [42170, 1.7], [10, 1.5], [534352, 1.5], [48900, 1.5], [2741, 1.9],
    [59144, 1.7], [8453, 1.7], [169, 1.7], [570, 1.7], [204, 1.7],
    [424, 2.1], [43114, 1.7], [7777777, 1.7], [690, 1.7],
]
const network = chainId => ({
    chain_id: String(chainId), name: `CUSTOM_NAME_${chainId}`, display_name: 'Test network',
    token: { symbol: 'ETH', decimals: 18 }, nodes: [], node_url: 'https://rpc.example',
})

for (const [chainId, multiplier] of migrated) {
    test(`chain ${chainId} preserves its price multiplier independently of network name`, () => {
        assert.equal(resolveEVMGasPolicy(chainId).baseFeeMultiplier, multiplier)
        assert.equal(resolveChain(network(chainId)).fees.baseFeeMultiplier(), multiplier)
        if (chainId !== 1 && chainId !== 56) {
            assert.equal(resolveEVMGasPolicy(chainId).transactionGasMode, 'wallet')
        }
    })
}

test('unknown chains retain the default policy', () => {
    const policy = resolveEVMGasPolicy(999999999)
    assert.equal(policy.baseFeeMultiplier, 1.2)
    assert.equal(policy.gasLimitMarginBps, 10000n)
    assert.equal(policy.transactionGasMode, 'wallet')
    assert.equal(policy.minPriorityFeePerGasGwei, undefined)
})

test('unit-conversion and ordering overrides remain in NetworkSettings', () => {
    const settings = NetworkSettings.KnownSettings
    assert.equal(settings[KnownInternalNames.Networks.EthereumSepolia].ChainOrder, 1)
    assert.equal(settings[KnownInternalNames.Networks.TempoMainnet].FeeParsingDecimalPlaces, 18)
    assert.equal(settings[KnownInternalNames.Networks.TempoTestnet].FeeParsingDecimalPlaces, 18)
})

const feeClient = chainId => createPublicClient({
    chain: resolveChain(network(chainId)),
    transport: custom({ request: async ({ method }) => {
        if (method === 'eth_getBlockByNumber') return { number: '0x1', baseFeePerGas: '0x64', transactions: [] }
        if (method === 'eth_gasPrice') return '0x64'
        if (method === 'eth_maxPriorityFeePerGas') return '0x1'
        assert.fail(`Unexpected RPC method ${method}`)
    } }),
})

test('BSC legacy fees apply the retained 1.2 price multiplier through real viem', async () => {
    const fees = await resolveEVMFeeData(feeClient(56), network(56))
    assert.equal(fees.gasPrice, 120n)
    assert.equal(fees.maxFeePerGas, undefined)
    assert.equal(fees.maxPriorityFeePerGas, undefined)
})

test('Ethereum EIP-1559 fees apply the retained 1.7 base-fee multiplier', async () => {
    const fees = await resolveEVMFeeData(feeClient(1), network(1))
    assert.equal(fees.maxFeePerGas, 171n)
    assert.equal(fees.maxPriorityFeePerGas, 1n)
})

for (const [chainId, priority, cap] of [[10, 100000n, 100150n], [43114, 1500000000n, 1500000170n]]) {
    test(`chain ${chainId} preserves its priority-fee floor and adjusts the cap`, async () => {
        const fees = await resolveEVMFeeData(feeClient(chainId), network(chainId))
        assert.equal(fees.maxPriorityFeePerGas, priority)
        assert.equal(fees.maxFeePerGas, cap)
    })
}
